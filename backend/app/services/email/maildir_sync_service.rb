class Email::MaildirSyncService
  # Normalize message id (strip < and > and whitespace)
  def self.clean_msg_id(raw)
    raw.to_s.gsub(/[<>]/, "").strip
  end

  # Synchronize Dovecot Maildir state with Rails Database for a user
  def self.sync_user(user)
    return unless user
    username = user.email.split("@").first.downcase
    base_dir = "/home/#{username}/Mail"
    return unless File.directory?(base_dir)

    # 1. Map all existing files in Maildir by clean Message-ID across standard and dot folders
    maildir_map = {} # clean_msg_id => { web_folder: "inbox|trash|sent...", path: "...", is_read: bool }

    folder_mapping = {
      "Inbox" => "inbox",
      ".Sent" => "sent",
      "Sent" => "sent",
      ".Drafts" => "drafts",
      "Drafts" => "drafts",
      ".Trash" => "trash",
      "Trash" => "trash",
      ".Junk" => "trash",
      "Junk" => "trash",
      ".Archive" => "archive",
      "Archive" => "archive",
      ".Approvals" => "approvals",
      "Approvals" => "approvals"
    }

    folder_mapping.each do |dovecot_folder, web_folder|
      ["cur", "new"].each do |sub|
        dir_path = File.join(base_dir, dovecot_folder, sub)
        next unless File.directory?(dir_path)

        Dir.glob(File.join(dir_path, "*")).each do |filepath|
          next if File.directory?(filepath)

          is_read = filepath.include?(":2,") && filepath.split(":2,").last.include?("S")
          raw_msg_id = extract_message_id_from_file(filepath)
          next if raw_msg_id.blank?
          clean_id = clean_msg_id(raw_msg_id)
          next if clean_id.blank?

          maildir_map[clean_id] = {
            web_folder: web_folder,
            dovecot_folder: dovecot_folder,
            filepath: filepath,
            is_read: is_read
          }
        end
      end
    end

    # Cache approved sender emails for quick lookup
    approved_senders = user.sender_rules.where(status: ["approved", "important"]).pluck(:email_address).map(&:downcase)

    # 2. Update existing DB emails according to Maildir changes from Thunderbird
    user.emails.where(folder: ["inbox", "approvals", "sent", "trash", "archive"]).find_each do |email|
      next if email.message_id.blank?
      clean_id = clean_msg_id(email.message_id)
      from_clean = email.from_address.to_s.gsub(/.*<([^>]+)>.*/, '\1').strip.downcase
      is_sender_approved = approved_senders.include?(from_clean) || !user.approval_system_enabled

      if maildir_map.key?(clean_id)
        info = maildir_map[clean_id]
        
        if is_sender_approved
          # If sender is approved: ensure file and DB are in inbox
          if info[:web_folder] == "approvals"
            on_email_moved_or_deleted(email, "inbox")
            email.update_columns(folder: "inbox", updated_at: Time.current) if email.folder != "inbox"
          elsif email.folder != info[:web_folder] && info[:web_folder] != "approvals"
            email.update_columns(folder: info[:web_folder], updated_at: Time.current)
          end
        else
          # If sender is UNAPPROVED and approval system is on: ensure email stays in approvals
          if user.approval_system_enabled && email.folder == "approvals"
            if info[:web_folder] == "inbox"
              on_email_moved_or_deleted(email, "approvals")
            end
          elsif email.folder != info[:web_folder]
            email.update_columns(folder: info[:web_folder], updated_at: Time.current)
          end
        end

        # If read in Thunderbird
        if !email.is_read && info[:is_read]
          email.update_columns(is_read: true, updated_at: Time.current)
        end
      end
    end

    # 3. If Thunderbird created new Sent or Inbox emails directly via IMAP/SMTP
    existing_clean_ids = user.emails.pluck(:message_id).compact.map { |m| clean_msg_id(m) }.to_set

    maildir_map.each do |clean_id, info|
      next if existing_clean_ids.include?(clean_id)

      begin
        raw = File.read(info[:filepath])
        parsed = Mail.new(raw)
        thread = user.emails.find_by(message_id: clean_msg_id(parsed.in_reply_to))&.thread
        parsed_from = parsed.from&.first.to_s.gsub(/.*<([^>]+)>.*/, '\1').strip.downcase
        parsed_subj = parsed.subject.to_s.strip

        # Deduplication check against recently created emails with same from and subject
        if user.emails.where("lower(from_address) LIKE ?", "%#{parsed_from}%").where(subject: parsed_subj).where("created_at > ?", 5.minutes.ago).exists?
          existing_clean_ids.add(clean_id)
          next
        end

        is_appr = approved_senders.include?(parsed_from) || !user.approval_system_enabled
        target_web_folder = if info[:web_folder] == "inbox" && !is_appr && user.approval_system_enabled
                              "approvals"
                            else
                              info[:web_folder]
                            end

        user.emails.create!(
          thread: thread,
          from_address: parsed.from&.first.to_s.presence || user.email,
          to_address: parsed.to&.join(", ").to_s.presence || "",
          cc: parsed.cc&.join(", "),
          subject: parsed.subject.presence || "(Başlıksız)",
          body_text: (parsed.text_part&.body&.decoded || (parsed.multipart? ? "" : (parsed.body&.decoded rescue ""))).to_s.force_encoding("UTF-8").scrub,
          body_html: (parsed.html_part&.body&.decoded rescue nil)&.to_s&.force_encoding("UTF-8")&.scrub,
          message_id: clean_id,
          folder: target_web_folder,
          is_read: info[:is_read]
        )
        existing_clean_ids.add(clean_id)
      rescue => e
        Rails.logger.warn "Failed to sync new mail from Maildir #{info[:filepath]}: #{e.message}"
      end
    end
  rescue => e
    Rails.logger.error "[MaildirSyncService Error] #{e.message}\n#{e.backtrace&.join("\n")}"
  end

  # When email is deleted / moved in Webmail -> move physical file in Maildir
  def self.on_email_moved_or_deleted(email, target_folder = "trash")
    return unless email && email.message_id.present?
    username = email.user.email.split("@").first.downcase
    base_dir = "/home/#{username}/Mail"
    return unless File.directory?(base_dir)

    target_sub = case target_folder.to_s.downcase
                 when "trash" then "Trash/cur"
                 when "inbox" then "Inbox/new"
                 when "archive" then "Archive/cur"
                 when "sent" then "Sent/cur"
                 when "approvals" then "Approvals/new"
                 else "Inbox/new"
                 end

    dest_dir = File.join(base_dir, target_sub)
    require "fileutils"
    FileUtils.mkdir_p(dest_dir)

    clean_target_id = clean_msg_id(email.message_id)

    # Find the existing file across ALL Maildir folders including dot-folders
    Dir.glob(File.join(base_dir, "{.*,*}", "{cur,new}", "*")).each do |filepath|
      next if File.directory?(filepath)
      raw_id = extract_message_id_from_file(filepath)
      if clean_msg_id(raw_id) == clean_target_id
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
