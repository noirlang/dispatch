class DispatchMailbox < ApplicationMailbox
  def process
    user = User.find_by(email: mail.to.first)
    return unless user

    # Check speakeasy code first
    if speakeasy_trusted?(user, mail)
      deliver_to_inbox(user, "inbox")
      return
    end

    from = mail.from.first
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
    user.emails.create!(
      thread: thread,
      from_address: mail.from.first,
      to_address: mail.to.first,
      cc: mail.cc&.join(", "),
      subject: mail.subject,
      body_text: mail.text_part&.body&.decoded || mail.decoded,
      body_html: mail.html_part&.body&.decoded,
      message_id: mail.message_id,
      folder: folder,
      is_read: false
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
    content = "#{mail.subject} #{mail.decoded}"
    user.speakeasy_codes.active.any? do |sc|
      if content.include?(sc.code) && sc.valid_code?
        sc.update!(used: true) if sc.single_use
        true
      end
    end
  end
end
