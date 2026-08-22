class BlogMailbox < ApplicationMailbox
  def process
    from    = mail.from.first
    subject = mail.subject.to_s.strip
    body    = extract_body

    return if subject.blank? || body.blank?

    # Resolve sender info
    profile = Email::SenderAvatarService.for(from)

    BlogPost.create!(
      title:        subject,
      content:      body,
      author_email: from,
      author_name:  profile[:name],
      author_avatar: profile[:avatar_url],
      published_at: mail.date || Time.current
    )
  end

  private

  def extract_body
    # Prefer plain text, strip quoted reply content
    text = mail.text_part&.body&.decoded || mail.decoded.to_s
    # Remove common email reply quotes (lines starting with >)
    text.gsub(/^>.*$/m, "").strip
  end
end
