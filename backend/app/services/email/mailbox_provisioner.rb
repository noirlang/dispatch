class Email::MailboxProvisioner
  def self.sync_account(user, raw_password)
    return if raw_password.blank? || Rails.env.test?

    username = user.email.split("@").first.to_s.strip.downcase
    domain = user.email.split("@").last.to_s.strip.downcase
    full_email = "#{username}@#{domain}"

    # Strict username validation to prevent command injection
    return unless username.match?(/\A[a-zA-Z0-9._-]+\z/)

    Rails.logger.info "[MailboxProvisioner] Syncing Dovecot / system password for #{full_email}..."

    # 1. Linux PAM / System User (EmailWiz standard /etc/passwd + /etc/shadow)
    sync_linux_pam(username, raw_password)

    # 2. Dovecot Passwd / Users file (/etc/dovecot/passwd, /etc/dovecot/users)
    sync_dovecot_passwd_files(username, domain, full_email, raw_password)

    # 3. Docker Mailserver environment (docker-mailserver container or config files)
    sync_docker_mailserver(full_email, raw_password)
  rescue => e
    Rails.logger.warn "[MailboxProvisioner] Error syncing account for #{user.email}: #{e.message}"
  end

  private

  # 1. Update Linux system user via useradd / chpasswd
  def self.sync_linux_pam(username, raw_password)
    return unless File.exist?("/etc/dovecot") || File.exist?("/etc/postfix") || File.exist?("/etc/passwd")

    require "open3"

    # Check if Linux system user exists
    user_exists = system("id", "-u", username, out: File::NULL, err: File::NULL)
    unless user_exists
      # Try normal useradd, fallback to sudo -n useradd
      created = system("useradd", "-m", "-G", "mail", "-s", "/usr/sbin/nologin", username, out: File::NULL, err: File::NULL)
      unless created
        system("sudo", "-n", "useradd", "-m", "-G", "mail", "-s", "/usr/sbin/nologin", username, out: File::NULL, err: File::NULL)
      end
    end

    # Update password via chpasswd
    chpasswd_cmds = [
      ["chpasswd"],
      ["sudo", "-n", "chpasswd"]
    ]

    chpasswd_cmds.each do |cmd|
      begin
        Open3.popen2(*cmd) do |stdin, _stdout, wait_thr|
          stdin.puts("#{username}:#{raw_password}")
          stdin.close
          break if wait_thr.value.success?
        end
      rescue => e
        Rails.logger.debug "[MailboxProvisioner] chpasswd (#{cmd.join(' ')}): #{e.message}"
      end
    end
  rescue => e
    Rails.logger.debug "[MailboxProvisioner] sync_linux_pam error: #{e.message}"
  end

  # 2. Update Dovecot passwd / virtual user files (/etc/dovecot/passwd, /etc/dovecot/users)
  def self.sync_dovecot_passwd_files(username, domain, full_email, raw_password)
    dovecot_passwd_paths = [
      "/etc/dovecot/passwd",
      "/etc/dovecot/users",
      "/etc/dovecot/dovecot-users"
    ]

    # Generate Dovecot password hash if doveadm is present, otherwise standard SHA512/BLF crypt
    hashed_pw = generate_dovecot_hash(raw_password)

    dovecot_passwd_paths.each do |file_path|
      next unless File.exist?(file_path) || File.exist?(File.dirname(file_path))

      # Update file entries for both full_email and username
      update_passwd_file(file_path, full_email, hashed_pw || raw_password)
      update_passwd_file(file_path, username, hashed_pw || raw_password)
    end
  rescue => e
    Rails.logger.debug "[MailboxProvisioner] sync_dovecot_passwd_files error: #{e.message}"
  end

  # 3. Update docker mailserver container or local config
  def self.sync_docker_mailserver(full_email, raw_password)
    require "open3"
    
    # Try docker exec if docker is running
    stdout, _stderr, status = Open3.capture3("docker", "ps", "--format", "{{.Names}}")
    if status.success? && stdout.include?("mailserver")
      _out, _err, add_status = Open3.capture3("docker", "exec", "mailserver", "setup", "email", "add", full_email, raw_password)
      unless add_status.success?
        Open3.capture3("docker", "exec", "mailserver", "setup", "email", "change-password", full_email, raw_password)
      end
    end

    # Also update docker/mailserver/config/postfix-accounts.cf if it exists
    cf_paths = [
      Rails.root.join("..", "docker", "mailserver", "config", "postfix-accounts.cf"),
      Rails.root.join("docker", "mailserver", "config", "postfix-accounts.cf"),
      "/tmp/docker-mailserver/postfix-accounts.cf"
    ]

    cf_paths.each do |cf_path|
      next unless File.exist?(cf_path)
      update_postfix_accounts_cf(cf_path, full_email, raw_password)
    end
  rescue => e
    Rails.logger.debug "[MailboxProvisioner] sync_docker_mailserver error: #{e.message}"
  end

  def self.generate_dovecot_hash(raw_password)
    require "open3"
    stdout, _stderr, status = Open3.capture3("doveadm", "pw", "-s", "SHA512-CRYPT", "-p", raw_password)
    return stdout.strip if status.success? && stdout.present?
    nil
  rescue
    nil
  end

  def self.update_passwd_file(file_path, identifier, password_or_hash)
    entry = "#{identifier}:#{password_or_hash}"
    if File.exist?(file_path) && File.writable?(file_path)
      lines = File.readlines(file_path) rescue []
      updated = false
      new_lines = lines.map do |line|
        if line.start_with?("#{identifier}:")
          updated = true
          "#{entry}\n"
        else
          line
        end
      end
      new_lines << "#{entry}\n" unless updated
      File.write(file_path, new_lines.join) rescue nil
    elsif File.exist?(file_path)
      # Try via sudo tee
      require "open3"
      Open3.popen2("sudo", "-n", "tee", file_path) do |stdin, _stdout, _wait_thr|
        lines = Open3.capture2("sudo", "-n", "cat", file_path).first.lines rescue []
        updated = false
        new_lines = lines.map do |line|
          if line.start_with?("#{identifier}:")
            updated = true
            "#{entry}\n"
          else
            line
          end
        end
        new_lines << "#{entry}\n" unless updated
        stdin.write(new_lines.join)
        stdin.close
      end rescue nil
    end
  end

  def self.update_postfix_accounts_cf(cf_path, email, raw_password)
    hash = generate_dovecot_hash(raw_password) || "{PLAIN}#{raw_password}"
    entry = "#{email}|#{hash}"
    lines = File.readlines(cf_path) rescue []
    updated = false
    new_lines = lines.map do |line|
      if line.start_with?("#{email}|")
        updated = true
        "#{entry}\n"
      else
        line
      end
    end
    new_lines << "#{entry}\n" unless updated
    File.write(cf_path, new_lines.join) rescue nil
  end
end
