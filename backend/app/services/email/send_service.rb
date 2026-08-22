class Email::SendService
  Result = Struct.new(:success?, :email, :error)

  def self.call(user, params)
    raw_body = params[:body].to_s
    raw_to = params[:to].to_s
    html_body = markdown_to_html(raw_body)

    # Expand any group aliases like @ekip or comma-separated recipients
    recipient_addresses = []
    raw_to.split(",").map(&:strip).reject(&:blank?).each do |target|
      if target.start_with?("@")
        group_name = target.delete_prefix("@").downcase
        group = user.contact_groups.find_by("lower(name) = ?", group_name)
        if group && group.member_list.any?
          recipient_addresses.concat(group.member_list)
        else
          recipient_addresses << target
        end
      else
        recipient_addresses << target
      end
    end
    recipient_addresses = recipient_addresses.map { |a| a.downcase.strip }.uniq
    return Result.new(false, nil, "Alıcı adresi bulunamadı") if recipient_addresses.empty?

    styled_html = <<~HTML
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
          a { color: #2563eb; text-decoration: underline; }
          blockquote { border-left: 3px solid #cbd5e1; margin: 12px 0; padding-left: 12px; color: #475569; }
          code { font-family: monospace; background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-size: 12px; }
          pre { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; overflow-x: auto; }
          ul, ol { padding-left: 20px; }
          strong { font-weight: 700; color: #0f172a; }
        </style>
      </head>
      <body>
        #{html_body}
      </body>
      </html>
    HTML

    # Auto-approve all destination recipients for the sender
    recipient_addresses.each do |to_addr|
      user.sender_rules.find_or_create_by(email_address: to_addr) do |r|
        r.status = "approved"
        r.approved_at = Time.current
      end
    end

    # Try sending via SMTP to all recipients
    recipient_addresses.each do |to_addr|
      begin
        mail = Mail.new do
          from    user.email
          to      to_addr
          cc      params[:cc] if params[:cc].present?
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
      recipient_user = User.find_by(email: to_addr)
      next unless recipient_user

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
        to_address: to_addr,
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

  def self.markdown_to_html(md)
    Email::EmailMdService.to_html(md)
  end
end
