module JwtHelper
  EXPIRY = 7.days

  def self.secret
    ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base.presence || "dev_secret_key_base_dispatch_32chars_minimum_ok"
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
