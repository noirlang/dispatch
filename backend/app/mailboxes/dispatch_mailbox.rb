class DispatchMailbox < ApplicationMailbox
  def process
    raw_recipients = [mail.to, mail.cc, mail.bcc, mail.header["X-Original-To"]&.value, mail.header["Delivered-To"]&.value, mail.header["Envelope-To"]&.value].flatten.compact
    cleaned_recipients = raw_recipients.map do |addr|
      addr.to_s.gsub(/.*<([^>]+)>.*/, '\1').strip.downcase
    end.reject(&:blank?).uniq

    user = User.where("LOWER(email) IN (?)", cleaned_recipients).first
    user ||= User.first if User.count == 1
    return unless user

    # Deduplication check: prevent multiple deliveries of the exact same message
    msg_id = mail.message_id.to_s.strip
    if msg_id.present? && user.emails.where(message_id: msg_id).exists?
      Rails.logger.info "[DispatchMailbox] Skipping duplicate email #{msg_id} for #{user.email}"
      return
    end

    # Check speakeasy code first
    if speakeasy_trusted?(user, mail)
      deliver_to_inbox(user, "inbox")
      return
    end

    from = mail.from&.first.to_s.gsub(/.*<([^>]+)>.*/, '\1').strip.downcase
    rule = user.sender_rules.find_by(email_address: from) ||
           user.sender_rules.find_by("? LIKE '%@' || domain", from)

    folder = case rule&.status
             when "approved"  then "inbox"
             when "blocked"   then "trash"
             else
               user.approval_system_enabled ? "approvals" : "inbox"
             end

    email = deliver_to_inbox(user, folder)
    EmailAiAnalysisWorker.perform_async(email.id) if user.ai_configured?
  end

  private

  def deliver_to_inbox(user, folder)
    thread = find_or_create_thread(user)

    # Extract incoming email attachments
    saved_attachments = []
    mail.attachments.each do |att|
      begin
        meta = EmailAttachmentService.save_raw_attachment(att.filename, att.body.decoded, att.content_type)
        saved_attachments << meta if meta
      rescue => e
        Rails.logger.warn "Failed to save incoming email attachment #{att.filename}: #{e.message}"
      end
    end

    from_addr = mail.from&.first.to_s.presence || "unknown@sender.com"
    to_addr = mail.to&.first.to_s.presence || user.email

    user.emails.create!(
      thread: thread,
      from_address: from_addr,
      to_address: to_addr,
      cc: mail.cc&.join(", "),
      subject: mail.subject.presence || "(Başlıksız)",
      body_text: (mail.text_part&.body&.decoded || (mail.multipart? ? "" : (mail.body&.decoded rescue ""))).to_s.force_encoding("UTF-8").scrub,
      body_html: (mail.html_part&.body&.decoded rescue nil)&.to_s&.force_encoding("UTF-8")&.scrub,
      message_id: mail.message_id.presence || "<#{SecureRandom.uuid}@#{user.email.split('@').last}>",
      folder: folder,
      is_read: false,
      attachments: saved_attachments
    )
  end

  def find_or_create_thread(user)
    in_reply_to = mail.in_reply_to
    if in_reply_to
      existing = user.emails.find_by(message_id: in_reply_to)
      existing&.thread || user.email_threads.create!(subject: mail.subject)
    else
      user.email_threads.create!(subject: mail.subject)
    end
  end

  def speakeasy_trusted?(user, mail)
    body_content = if mail.multipart?
                     mail.parts.reject(&:attachment?).map { |p| (p.body&.decoded.to_s.force_encoding("UTF-8").scrub rescue "") }.join(" ")
                   else
                     (mail.body&.decoded.to_s.force_encoding("UTF-8").scrub rescue "")
                   end
    content = "#{mail.subject} #{body_content}"
    user.speakeasy_codes.active.any? do |sc|
      if content.include?(sc.code) && sc.valid_code?
        sc.update!(used: true) if sc.single_use
        true
      end
    end
  end
end


