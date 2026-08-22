module JwtHelper
  EXPIRY = 7.days
  FALLBACK_SECRET = "dev_secret_key_base_dispatch_32chars_minimum_ok".freeze

  def self.secret
    key = ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base.presence
    if key.blank? || key == FALLBACK_SECRET
      # L4 Fix: Raise in production — never allow hardcoded fallback in production
      raise "SECRET_KEY_BASE ortam değişkeni tanımlı değil!" if Rails.env.production?
      Rails.logger.warn "[SECURITY] SECRET_KEY_BASE tanımlı değil — geliştirme varsayılanı kullanılıyor. Bu ayar production'da ASLA kullanılmamalıdır!"
      return FALLBACK_SECRET
    end
    key
  end

  def self.encode(payload)
    payload[:exp] = EXPIRY.from_now.to_i
    JWT.encode(payload, secret, "HS256")
  end

  def self.decode(token)
    JWT.decode(token, secret, true, algorithm: "HS256").first
  rescue JWT::DecodeError
    nil
  end
end

