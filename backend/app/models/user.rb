class User < ApplicationRecord
  has_secure_password

  has_many :emails, dependent: :destroy
  has_many :email_threads, dependent: :destroy
  has_many :sender_rules, dependent: :destroy
  has_many :speakeasy_codes, dependent: :destroy
  has_many :calendar_events, dependent: :destroy
  has_many :rss_feeds, dependent: :destroy
  has_many :dashboard_cards, dependent: :destroy

  validates :name,  presence: true
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }

  attr_encrypted :gemini_key,  key: :encryption_key
  attr_encrypted :claude_key,  key: :encryption_key
  attr_encrypted :openai_key,  key: :encryption_key

  def ai_configured?
    gemini_key.present? || claude_key.present? || openai_key.present?
  end

  def active_ai_key
    case ai_provider
    when "gemini" then gemini_key
    when "claude" then claude_key
    when "openai" then openai_key
    end
  end

  private

  def encryption_key
    Rails.application.secret_key_base[0..31]
  end
end
