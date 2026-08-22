class Email::MailboxProvisioner
  def self.sync_account(user, raw_password)
    return if raw_password.blank? || Rails.env.test?

    username = user.email.split("@").first.to_s.strip
    domain = user.email.split("@").last.to_s.strip

    # Strict username validation to prevent command injection
    return unless username.match?(/\A[a-zA-Z0-9._-]+\z/)

    # 1. Production Linux Postfix + Dovecot (EmailWiz PAM stack)
    if File.exist?("/etc/dovecot") || File.exist?("/etc/postfix")
      # Check if Linux system user exists
      unless system("id", "-u", username, out: File::NULL, err: File::NULL)
        system("useradd", "-m", "-G", "mail", "-s", "/usr/sbin/nologin", username, out: File::NULL, err: File::NULL)
      end
      
      # Update Linux PAM password via chpasswd stdin without shell interpolation
      begin
        require "open3"
        Open3.popen2("chpasswd") do |stdin, _stdout, _wait_thr|
          stdin.puts("#{username}:#{raw_password}")
          stdin.close
        end
      rescue => e
        Rails.logger.warn "chpasswd execution: #{e.message}"
      end
    end

    # 2. Local Docker Mailserver environment (if running in docker compose)
    begin
      require "open3"
      stdout, _stderr, status = Open3.capture3("docker", "ps", "--format", "{{.Names}}")
      if status.success? && stdout.include?("mailserver")
        # Use safe argument array without shell expansion
        _out, _err, add_status = Open3.capture3("docker", "exec", "mailserver", "setup", "email", "add", user.email, raw_password)
        unless add_status.success?
          Open3.capture3("docker", "exec", "mailserver", "setup", "email", "change-password", user.email, raw_password)
        end
      end
    rescue => e
      Rails.logger.warn "Docker mailserver sync: #{e.message}"
    end
  rescue => e
    Rails.logger.warn "MailboxProvisioner error: #{e.message}"
  end
end
