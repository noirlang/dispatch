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

    # Parse and prepare attachments list
    raw_attachments = params[:attachments]
    processed_attachments = []
    if raw_attachments.is_a?(Array)
      raw_attachments.each do |att|
        if att.is_a?(ActionDispatch::Http::UploadedFile)
          processed_attachments << EmailAttachmentService.save_uploaded_file(att)
        else
          hash = att.respond_to?(:to_unsafe_h) ? att.to_unsafe_h.stringify_keys : (att.is_a?(Hash) ? att.stringify_keys : nil)
          next unless hash
          if hash["attachment"].is_a?(Hash)
            processed_attachments << hash["attachment"].stringify_keys
          elsif hash["attachments"].is_a?(Array)
            hash["attachments"].each { |a| processed_attachments << a.stringify_keys if a.is_a?(Hash) }
          elsif hash["filename"].present?
            processed_attachments << hash
          end
        end
      end
    elsif raw_attachments.is_a?(ActionDispatch::Http::UploadedFile)
      processed_attachments << EmailAttachmentService.save_uploaded_file(raw_attachments)
    end



    # Auto-approve all destination recipients for the sender
    recipient_addresses.each do |to_addr|
      user.sender_rules.find_or_create_by(email_address: to_addr) do |r|
        r.status = "approved"
        r.approved_at = Time.current
      end
    end

    sender_domain = user.email.split("@").last.presence || server_domain

    from_header = user.name.present? ? "#{user.name} <#{user.email}>" : user.email

    # 1. Distinguish between local recipients and external SMTP recipients
    local_recipients = []
    external_recipients = []

    recipient_addresses.each do |addr|
      clean_addr = addr.downcase.strip
      next if clean_addr.start_with?("blog@")

      if User.where("lower(email) = ?", clean_addr).exists?
        local_recipients << clean_addr
      else
        external_recipients << clean_addr
      end
    end

    # 2. Deliver via SMTP ONLY to external recipients (e.g. gmail, yahoo) once
    if external_recipients.any?
      begin
        mail = Mail.new do
          from       from_header
          to         external_recipients.join(", ")
          cc         cc_addresses.join(", ") if cc_addresses.any?
          subject    params[:subject]
          message_id "<#{SecureRandom.uuid}@#{sender_domain}>"
          date       Time.now

          text_part do
            content_type 'text/plain; charset=UTF-8'
            body raw_body
          end

          html_part do
            content_type 'text/html; charset=UTF-8'
            body styled_html
          end
        end

        # Attach actual files to outgoing SMTP email
        processed_attachments.each do |att|
          file_path = att["path"] || Rails.root.join("public", att["url"].to_s.delete_prefix("/"))
          if File.exist?(file_path)
            mail.attachments[att["filename"] || File.basename(file_path)] = {
              mime_type: att["content_type"],
              content: File.binread(file_path)
            }
          end
        end

        mail_host = ENV.fetch("MAIL_HOST", "127.0.0.1")
        mail_port = ENV.fetch("MAIL_PORT", 25).to_i

        delivery_options = {
          address: mail_host,
          port: mail_port,
          enable_starttls_auto: false
        }

        if ENV["MAIL_PASSWORD"].present?
          delivery_options[:user_name] = user.email
          delivery_options[:password] = ENV["MAIL_PASSWORD"]
          delivery_options[:authentication] = :plain
        end

        mail.delivery_method :smtp, delivery_options
        mail.deliver!
        Rails.logger.info "[Email SendService] Outgoing mail delivered via SMTP to #{external_recipients.join(', ')} (Subject: #{params[:subject]})"
      rescue => e
        Rails.logger.error "[Email SendService SMTP Error] #{e.message}\n#{e.backtrace&.join("\n")}"
      end
    end

    # Save to sender's Sent folder
    email = user.emails.create!(
      from_address: from_header,
      to_address: params[:to],
      cc: params[:cc],
      subject: params[:subject],
      body_text: raw_body,
      body_html: styled_html,
      message_id: "<#{SecureRandom.uuid}@#{sender_domain}>",
      folder: "sent",
      is_read: true,
      attachments: processed_attachments
    )

    # Sync copy to Thunderbird & IMAP Sent Maildir folder
    begin
      sent_mail_copy = Mail.new do
        from       from_header
        to         to_addresses.join(', ')
        cc         cc_addresses.join(', ') if cc_addresses.any?
        subject    params[:subject]
        date       Time.now
        message_id email.message_id

        text_part do
          content_type 'text/plain; charset=UTF-8'
          body raw_body
        end

        if styled_html.present?
          html_part do
            content_type 'text/html; charset=UTF-8'
            body styled_html
          end
        end
      end
      Email::MaildirDeliveryService.deliver_sent(user, sent_mail_copy.encoded)
    rescue => e
      Rails.logger.warn "Failed to write sent copy to Maildir: #{e.message}"
    end


    # Deliver to local recipients if they exist on this system
    recipient_addresses.each do |to_addr|
      # Check if sending to blog@ address
      if to_addr.downcase.start_with?("blog@")
        if params[:subject].to_s.strip =~ /\A\s*rm\s*:\s*(.+)/i
          target_title = $1.strip
          post = BlogPost.find_author_post_to_delete(user.email, target_title)

          if post
            post.destroy!
            Rails.logger.info "[SendService] User #{user.email} successfully deleted blog post: #{post.title} (Slug: #{post.slug})"
          else
            Rails.logger.warn "[SendService] Delete failed: No post with title/slug '#{target_title}' found for author #{user.email}"
          end
        else
          BlogPost.create!(
            title: params[:subject],
            content: raw_body,
            author_email: user.email,
            author_name: user.name,
            author_avatar: user.avatar_path,
            published_at: Time.current
          )
        end
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
            **Orijinal İleti:** Konu: `#{ERB::Util.html_escape(params[:subject].to_s)}`
          MD
          # H8 Fix: Never include original email body in bounce — may contain OTP, passwords or PII


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
        from_address: from_header,
        to_address: recipient_user.email,
        cc: params[:cc],
        subject: params[:subject],
        body_text: raw_body,
        body_html: styled_html,
        message_id: email.message_id,
        folder: recipient_folder,
        is_read: false,
        attachments: processed_attachments
      )

      # Deliver copy to local recipient's Dovecot Maildir for Thunderbird & IMAP
      begin
        local_msg = Mail.new do
          from       from_header
          to         recipient_user.email
          cc         params[:cc] if params[:cc].present?
          subject    params[:subject]
          date       Time.now
          message_id recipient_email.message_id

          text_part do
            content_type 'text/plain; charset=UTF-8'
            body raw_body
          end

          if styled_html.present?
            html_part do
              content_type 'text/html; charset=UTF-8'
              body styled_html
            end
          end
        end
        Email::MaildirDeliveryService.deliver_inbox(recipient_user, local_msg.encoded, recipient_folder)
      rescue => e
        Rails.logger.warn "Failed to deliver to recipient Maildir: #{e.message}"
      end


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
    sanitized_raw = raw.to_s.gsub(/[\r\n\0]/, ", ")
    addresses = []
    sanitized_raw.split(/[,;]/).map(&:strip).reject(&:blank?).each do |target|
      clean_target = target.gsub(/[\r\n\0\t]/, "").strip
      next if clean_target.blank?
      if clean_target.start_with?("@")
        group_name = clean_target.delete_prefix("@").downcase.strip
        group = user.contact_groups.find_by("lower(name) = ?", group_name)
        if group && group.member_list.any?
          addresses.concat(group.member_list)
        else
          addresses << "#{group_name}@#{server_domain}"
        end
      elsif clean_target.include?("@")
        extracted = clean_target.gsub(/.*<([^>]+)>.*/, '\1').strip.downcase
        addresses << extracted
      else
        addresses << "#{clean_target.downcase.strip}@#{server_domain}"
      end
    end
    addresses.map { |a| a.gsub(/[\r\n\0]/, "").downcase.strip }.reject(&:blank?).uniq
  end

  def self.markdown_to_html(md)
    Email::EmailMdService.to_html(md)
  end
end
