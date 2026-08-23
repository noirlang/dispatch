class Email::MaildirSyncService
  # Synchronize Dovecot Maildir state with Rails Database for a user
  def self.sync_user(user)
    return unless user
    username = user.email.split("@").first.downcase
    base_dir = "/home/#{username}/Mail"
    return unless File.directory?(base_dir)

    # 1. Map all existing files in Maildir by Message-ID
    # Folders: Inbox, Sent, Drafts, Trash, Junk, Archive, Approvals
    maildir_map = {} # message_id => { folder: "inbox|trash|sent...", path: "...", is_read: bool }

    folder_mapping = {
      "Inbox" => "inbox",
      "Sent" => "sent",
      "Drafts" => "drafts",
      "Trash" => "trash",
      "Junk" => "trash",
      "Archive" => "archive",
      "Approvals" => "approvals"
    }

    folder_mapping.each do |dovecot_folder, web_folder|
      ["cur", "new"].each do |sub|
        dir_path = File.join(base_dir, dovecot_folder, sub)
        next unless File.directory?(dir_path)

        Dir.glob(File.join(dir_path, "*")).each do |filepath|
          next if File.directory?(filepath)

          is_read = filepath.include?(":2,") && filepath.split(":2,").last.include?("S")
          # Read first 4KB to quickly extract Message-ID and headers
          msg_id = extract_message_id_from_file(filepath)
          next if msg_id.blank?

          maildir_map[msg_id] = {
            web_folder: web_folder,
            dovecot_folder: dovecot_folder,
            filepath: filepath,
            is_read: is_read
          }
        end
      end
    end

    # 2. Update existing DB emails according to Maildir changes from Thunderbird
    user.emails.where(folder: ["inbox", "approvals", "sent", "trash", "archive"]).find_each do |email|
      next if email.message_id.blank?
      clean_msg_id = email.message_id.strip

      if maildir_map.key?(clean_msg_id)
        info = maildir_map[clean_msg_id]
        
        # If moved in Thunderbird (e.g. from Inbox to Trash)
        if email.folder != info[:web_folder]
          email.update_columns(folder: info[:web_folder], updated_at: Time.current)
        end

        # If read in Thunderbird
        if !email.is_read && info[:is_read]
          email.update_columns(is_read: true, updated_at: Time.current)
        end
      else
        # If Thunderbird expunged/permanently deleted from Inbox
        if email.folder == "inbox" || email.folder == "approvals"
          email.update_columns(folder: "trash", updated_at: Time.current)
        end
      end
    end

    # 3. If Thunderbird created new Sent or Inbox emails directly via IMAP/SMTP
    maildir_map.each do |msg_id, info|
      next if user.emails.where(message_id: msg_id).exists?

      # Parse newly found email from Maildir
      begin
        raw = File.read(info[:filepath])
        parsed = Mail.new(raw)
        thread = user.emails.find_by(message_id: parsed.in_reply_to)&.thread

        user.emails.create!(
          thread: thread,
          from_address: parsed.from&.first.to_s.presence || user.email,
          to_address: parsed.to&.join(", ").to_s.presence || "",
          cc: parsed.cc&.join(", "),
          subject: parsed.subject.presence || "(Başlıksız)",
          body_text: (parsed.text_part&.body&.decoded || (parsed.multipart? ? "" : (parsed.body&.decoded rescue ""))).to_s.force_encoding("UTF-8").scrub,
          body_html: (parsed.html_part&.body&.decoded rescue nil)&.to_s&.force_encoding("UTF-8")&.scrub,
          message_id: msg_id,
          folder: info[:web_folder],
          is_read: info[:is_read]
        )
      rescue => e
        Rails.logger.warn "Failed to sync new mail from Maildir #{info[:filepath]}: #{e.message}"
      end
    end
  rescue => e
    Rails.logger.error "[MaildirSyncService Error] #{e.message}\n#{e.backtrace&.join("\n")}"
  end

  # When email is deleted / moved in Webmail -> move file in Maildir
  def self.on_email_moved_or_deleted(email, target_folder = "trash")
    return unless email && email.message_id.present?
    username = email.user.email.split("@").first.downcase
    base_dir = "/home/#{username}/Mail"
    return unless File.directory?(base_dir)

    target_dovecot_folder = case target_folder
                            when "trash" then "Trash"
                            when "inbox" then "Inbox"
                            when "archive" then "Archive"
                            when "sent" then "Sent"
                            else "Trash"
                            end

    dest_dir = File.join(base_dir, target_dovecot_folder, "cur")
    require "fileutils"
    FileUtils.mkdir_p(dest_dir)

    # Find the existing file across all Maildir folders
    Dir.glob(File.join(base_dir, "*", "*", "*")).each do |filepath|
      next if File.directory?(filepath)
      msg_id = extract_message_id_from_file(filepath)
      if msg_id == email.message_id.strip
        new_path = File.join(dest_dir, File.basename(filepath))
        FileUtils.mv(filepath, new_path) unless filepath == new_path
        File.chmod(0666, new_path) rescue nil
        break
      end
    end
  rescue => e
    Rails.logger.warn "Failed on_email_moved_or_deleted: #{e.message}"
  end

  private

  def self.extract_message_id_from_file(filepath)
    # Read first 4KB for headers
    header_chunk = File.open(filepath, "r:binary") { |f| f.read(4096) } rescue ""
    if header_chunk =~ /^Message-ID:\s*<([^>]+)>/i
      return "<#{$1}>"
    elsif header_chunk =~ /^Message-Id:\s*<([^>]+)>/i
      return "<#{$1}>"
    elsif header_chunk =~ /^Message-ID:\s*(\S+)/i
      return $1.strip
    end
    nil
  end
end
