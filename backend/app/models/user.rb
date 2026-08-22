require "openssl"
require "base64"
require "digest"

class User < ApplicationRecord
  has_secure_password

  has_many :emails, dependent: :destroy
  has_many :email_threads, dependent: :destroy
  has_many :sender_rules, dependent: :destroy
  has_many :speakeasy_codes, dependent: :destroy
  has_many :calendar_events, dependent: :destroy
  has_many :rss_feeds, dependent: :destroy
  has_many :dashboard_cards, dependent: :destroy
  has_many :contact_groups, dependent: :destroy

  validates :name,  presence: true
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }

  after_save :sync_system_mailbox, if: -> { saved_change_to_password_digest? && @raw_password_for_sync.present? }

  def password=(unencrypted_password)
    @raw_password_for_sync = unencrypted_password
    super
  end

  def sync_system_mailbox
    Email::MailboxProvisioner.sync_account(self, @raw_password_for_sync)
  end

  def gemini_key
    decrypt_value(encrypted_gemini_key, encrypted_gemini_key_iv)
  end

  def gemini_key=(val)
    enc, iv = encrypt_value(val)
    self.encrypted_gemini_key = enc
    self.encrypted_gemini_key_iv = iv
  end

  def claude_key
    decrypt_value(encrypted_claude_key, encrypted_claude_key_iv)
  end

  def claude_key=(val)
    enc, iv = encrypt_value(val)
    self.encrypted_claude_key = enc
    self.encrypted_claude_key_iv = iv
  end

  def openai_key
    decrypt_value(encrypted_openai_key, encrypted_openai_key_iv)
  end

  def openai_key=(val)
    enc, iv = encrypt_value(val)
    self.encrypted_openai_key = enc
    self.encrypted_openai_key_iv = iv
  end

  def ai_configured?
    active_ai_key.present?
  end

  def active_ai_key
    case ai_provider
    when "gemini" then gemini_key
    when "claude" then claude_key
    when "openai" then openai_key
    else gemini_key || claude_key || openai_key
    end
  rescue => e
    nil
  end

  private

  def encrypt_value(val)
    return [nil, nil] if val.blank?
    cipher = OpenSSL::Cipher.new("aes-256-cbc")
    cipher.encrypt
    cipher.key = Digest::SHA256.digest(encryption_secret)
    iv = cipher.random_iv
    cipher.iv = iv
    encrypted = cipher.update(val.to_s) + cipher.final
    [Base64.strict_encode64(encrypted), Base64.strict_encode64(iv)]
  rescue => e
    Rails.logger.warn "Encryption fallback: #{e.message}"
    [Base64.strict_encode64(val.to_s), "plain"]
  end

  def decrypt_value(enc_val, iv_val)
    return nil if enc_val.blank?
    if iv_val == "plain"
      return Base64.strict_decode64(enc_val)
    end
    
    cipher = OpenSSL::Cipher.new("aes-256-cbc")
    cipher.decrypt
    cipher.key = Digest::SHA256.digest(encryption_secret)
    cipher.iv = Base64.strict_decode64(iv_val) if iv_val.present?
    decrypted = cipher.update(Base64.strict_decode64(enc_val)) + cipher.final
    decrypted
  rescue => e
    begin
      Base64.strict_decode64(enc_val)
    rescue
      enc_val
    end
  end

  def encryption_secret
    ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base.presence || "dispatch_master_secret_encryption_key_32_bytes!!"
  end
end
