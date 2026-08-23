class BlogMailbox < ApplicationMailbox
  def process
    from    = mail.from&.first.to_s
    subject = mail.subject.to_s.strip
    body    = extract_body

    return if subject.blank?

    # Check if this is a deletion request (e.g. Rm: Blog Başlığı or rm: slug)
    if subject =~ /\A\s*rm\s*:\s*(.+)/i
      target_title = $1.strip
      post = BlogPost.find_author_post_to_delete(from, target_title)

      if post
        post.destroy!
        Rails.logger.info "[BlogMailbox] Author #{from} successfully deleted blog post: #{post.title} (Slug: #{post.slug})"
      else
        Rails.logger.warn "[BlogMailbox] Delete failed: No post with title/slug '#{target_title}' found for author #{from}"
      end
      return
    end

    return if body.blank?

    # Deduplication check: if post with same author and title was created in the last 2 minutes, skip
    if BlogPost.where(author_email: from, title: subject).where("created_at > ?", 2.minutes.ago).exists?
      Rails.logger.info "[BlogMailbox] Duplicate blog post skipped for #{from} - #{subject}"
      return
    end

    user = User.find_by("LOWER(email) = ?", from.downcase.strip)
    profile = Email::SenderAvatarService.for(from)

    BlogPost.create!(
      title:        subject,
      content:      body,
      author_email: from,
      author_name:  user&.name || profile[:name],
      author_avatar: user&.avatar_path || profile[:avatar_url],
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
