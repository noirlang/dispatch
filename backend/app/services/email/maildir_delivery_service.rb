class Email::MaildirDeliveryService
  def self.deliver_inbox(email_or_user, raw_email, folder = "inbox")
    username = extract_username(email_or_user)
    return unless username.present?
    base_dir = "/home/#{username}/Mail"
    return unless File.directory?(base_dir)

    target_folders = case folder.to_s.downcase
                     when "approvals" then [".Approvals", "Approvals"]
                     when "trash" then [".Trash", "Trash"]
                     when "sent" then [".Sent", "Sent"]
                     when "drafts" then [".Drafts", "Drafts"]
                     when "archive" then [".Archive", "Archive"]
                     else ["Inbox"]
                     end

    require "fileutils"
    target_folders.each do |tf|
      dir = File.join(base_dir, tf, "new")
      FileUtils.mkdir_p(dir)
      fname = "#{Time.now.to_i}.#{SecureRandom.hex(8)}.debian"
      fpath = File.join(dir, fname)
      File.write(fpath, raw_email)
      File.chmod(0666, fpath) rescue nil
    end
  rescue => e
    Rails.logger.warn "[MaildirDeliveryService Error] #{e.message}"
  end

  def self.deliver_sent(email_or_user, raw_email)
    deliver_inbox(email_or_user, raw_email, "sent")
  end

  def self.extract_username(email_or_user)
    addr = email_or_user.is_a?(User) ? email_or_user.email : email_or_user.to_s
    clean = addr.gsub(/.*<([^>]+)>.*/, '\1').strip.downcase
    clean.split("@").first
  end
end
