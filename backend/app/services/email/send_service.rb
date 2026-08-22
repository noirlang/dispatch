class Email::SendService
  Result = Struct.new(:success?, :email, :error)

  def self.call(user, params)
    raw_body = params[:body].to_s
    html_body = markdown_to_html(raw_body)
    server_domain = ServerConfig.current&.domain.presence || "dispatch.local"

    # Expand any group aliases like @ekip or comma/semicolon-separated recipients
    to_addresses = parse_addresses(params[:to], user, server_domain)
    cc_addresses = parse_addresses(params[:cc], user, server_domain)
    bcc_addresses = parse_addresses(params[:bcc], user, server_domain)

    recipient_addresses = (to_addresses + cc_addresses + bcc_addresses).uniq
    return Result.new(false, nil, "Alıcı adresi bulunamadı") if recipient_addresses.empty?

    styled_html = html_body.to_s

    # Auto-approve all destination recipients for the sender
    recipient_addresses.each do |to_addr|
      user.sender_rules.find_or_create_by(email_address: to_addr) do |r|
        r.status = "approved"
        r.approved_at = Time.current
      end
    end

    # Try sending via SMTP to all recipients
    recipient_addresses.each do |dest_addr|
      begin
        mail = Mail.new do
          from    user.email
          to      to_addresses.join(", ")
          cc      cc_addresses.join(", ") if cc_addresses.any?
          subject params[:subject]

          text_part do
            content_type 'text/plain; charset=UTF-8'
            body raw_body
          end

          html_part do
            content_type 'text/html; charset=UTF-8'
            body styled_html
          end
        end

        mail.delivery_method :smtp, {
          address: ENV.fetch("MAIL_HOST", "127.0.0.1"),
          port: ENV.fetch("MAIL_PORT", 1025).to_i,
          user_name: user.email,
          password: ENV["MAIL_PASSWORD"],
          authentication: :plain,
          enable_starttls_auto: false
        }
        mail.deliver! rescue nil
      rescue => e
        Rails.logger.warn "SMTP delivery warning: #{e.message}"
      end
    end

    # Save to sender's Sent folder
    email = user.emails.create!(
      from_address: user.email,
      to_address: params[:to],
      cc: params[:cc],
      subject: params[:subject],
      body_text: raw_body,
      body_html: styled_html,
      folder: "sent",
      is_read: true
    )

    # Deliver to local recipients if they exist on this system
    recipient_addresses.each do |to_addr|
      # Check if sending to blog@ address
      if to_addr.downcase.start_with?("blog@")
        post = BlogPost.create!(
          title: params[:subject],
          content: raw_body,
          author_email: user.email,
          author_name: user.name,
          author_avatar: user.avatar_path,
          published_at: Time.current
        )

        confirm_body = <<~MD
          ::: callout success
          🎉 **Tebrikler! Blog Yazınız Başarıyla Yayınlandı**
          :::

          Sayın **#{user.name}**,

          `#{params[:subject]}` başlıklı blog yazınız sisteme kaydedildi ve başarıyla yayınlandı.

          - **Yazar:** #{user.name} (@#{post.author_handle})
          - **Başlık:** #{post.title}
          - **Yayın Tarihi:** #{Time.current.strftime('%d.%m.%Y %H:%M')}
          - **Yazı Bağlantısı:** `/@#{post.author_handle}/#{post.slug}`

          [Yazıyı Görüntüle](/@#{post.author_handle}/#{post.slug}){button}
        MD
        confirm_html = markdown_to_html(confirm_body)

        user.emails.create!(
          from_address: "blog@#{server_domain}",
          to_address: user.email,
          subject: "🎉 Blog Yazınız Yayınlandı: #{params[:subject]}",
          body_text: confirm_body,
          body_html: confirm_html,
          folder: "inbox",
          is_read: false
        )
        next
      end

      # Exact email match ONLY
      recipient_user = User.find_by("lower(email) = ?", to_addr.downcase.strip)

      if recipient_user.nil?
        # If recipient domain is our local server domain, send bounce mail to sender
        if to_addr.downcase.end_with?("@#{server_domain.downcase}")
          bounce_body = <<~MD
            ::: callout warning
            ⚠️ **Teslim Edilemedi (Undelivered Mail Returned to Sender)**
            :::

            Sayın **#{user.name}**,

            Göndermiş olduğunuz e-posta alıcı adresine teslim edilemedi:
            - **Hatalı Alıcı:** `#{to_addr}`
            - **Durum:** `550 5.1.1 Alıcı adresi bu sunucuda bulunamadı (User unknown).`
            - **Tarih:** #{Time.current.strftime('%d.%m.%Y %H:%M')}

            Lütfen e-posta adresini kontrol ederek iletinizi yeniden gönderin.

            ---
            **Orijinal İleti Detayları:**
            - **Konu:** #{params[:subject]}
            - **İçerik Özeti:**
            > #{raw_body.to_s.lines.first(5).map { |l| l.strip }.join("\n> ")}
          MD

          bounce_html = markdown_to_html(bounce_body)

          user.emails.create!(
            from_address: "mailer-daemon@#{server_domain}",
            to_address: user.email,
            subject: "Mail Teslim Edilemedi (Undelivered): #{params[:subject]}",
            body_text: bounce_body,
            body_html: bounce_html,
            folder: "inbox",
            is_read: false
          )
        end
        next
      end

      full_content = "#{params[:subject]} #{raw_body}"
      
      # 1. Check Speakeasy Passcode
      speakeasy_matched = recipient_user.speakeasy_codes.active.any? do |sc|
        if full_content.include?(sc.code) && sc.valid_code?
          sc.update!(used: true) if sc.single_use
          true
        end
      end

      # 2. Check if recipient previously sent to this user
      has_previous_sent = recipient_user.emails.where(folder: "sent", to_address: user.email.downcase.strip).exists?
      rule = recipient_user.sender_rules.find_by(email_address: user.email.downcase.strip)
      
      recipient_folder = if speakeasy_matched || has_previous_sent || rule&.status == "approved" || rule&.status == "important"
        "inbox"
      elsif rule&.status == "blocked"
        "trash"
      else
        recipient_user.approval_system_enabled ? "approvals" : "inbox"
      end

      recipient_email = recipient_user.emails.create!(
        from_address: user.email,
        to_address: recipient_user.email,
        cc: params[:cc],
        subject: params[:subject],
        body_text: raw_body,
        body_html: styled_html,
        folder: recipient_folder,
        is_read: false
      )

      # Trigger AI analysis for recipient
      if recipient_user.ai_configured?
        Thread.new do
          Rails.application.executor.wrap do
            EmailAiAnalysisWorker.new.perform(recipient_email.id)
          end
        end
      end
    end

    Result.new(true, email, nil)
  rescue => e
    Result.new(false, nil, e.message)
  end

  def self.parse_addresses(raw, user, server_domain)
    return [] if raw.blank?
    addresses = []
    raw.to_s.split(/[,;]/).map(&:strip).reject(&:blank?).each do |target|
      if target.start_with?("@")
        group_name = target.delete_prefix("@").downcase.strip
        group = user.contact_groups.find_by("lower(name) = ?", group_name)
        if group && group.member_list.any?
          addresses.concat(group.member_list)
        else
          addresses << "#{group_name}@#{server_domain}"
        end
      elsif target.include?("@")
        addresses << target.downcase.strip
      else
        addresses << "#{target.downcase.strip}@#{server_domain}"
      end
    end
    addresses.map { |a| a.downcase.strip }.uniq
  end

  def self.markdown_to_html(md)
    Email::EmailMdService.to_html(md)
  end
end
