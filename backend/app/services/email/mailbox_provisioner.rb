class Email::MailboxProvisioner
  def self.sync_account(user, raw_password)
    return if raw_password.blank? || Rails.env.test?

    username = user.email.split("@").first
    domain = user.email.split("@").last

    # 1. Production Linux Postfix + Dovecot (EmailWiz PAM stack)
    if File.exist?("/etc/dovecot") || File.exist?("/etc/postfix")
      # Create Linux system user in 'mail' group if doesn't exist
      system("id -u #{username} >/dev/null 2>&1 || useradd -m -G mail -s /usr/sbin/nologin #{username} 2>/dev/null")
      
      # Update Linux PAM password via chpasswd so Thunderbird / IMAP / SMTP authenticate seamlessly
      begin
        IO.popen(["chpasswd"], "w") do |io|
          io.puts("#{username}:#{raw_password}")
        end
      rescue => e
        Rails.logger.warn "chpasswd execution: #{e.message}"
      end
    end

    # 2. Local Docker Mailserver environment (if running in docker compose)
    begin
      if system("which docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -q mailserver")
        system("docker exec mailserver setup email add #{user.email} '#{raw_password}' 2>/dev/null || docker exec mailserver setup email change-password #{user.email} '#{raw_password}' 2>/dev/null")
      end
    rescue => e
      Rails.logger.warn "Docker mailserver sync: #{e.message}"
    end
  rescue => e
    Rails.logger.warn "MailboxProvisioner error: #{e.message}"
  end
end
