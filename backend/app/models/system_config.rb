require "bcrypt"

class SystemConfig < ApplicationRecord
  validates :key, presence: true, uniqueness: true

  def self.get(key, default = nil)
    find_by(key: key.to_s)&.value || default
  end

  def self.set(key, value)
    cfg = find_or_initialize_by(key: key.to_s)
    cfg.value = value.to_s
    cfg.save!
  end

  def self.admin_password_valid?(input_password)
    return false if input_password.blank?

    stored_digest = get("admin_password_digest")
    if stored_digest.present?
      BCrypt::Password.new(stored_digest) == input_password.to_s
    else
      env_pw = ENV["ADMIN_PASSWORD"].presence || "admin1234"
      input_password.to_s == env_pw
    end
  rescue
    false
  end

  def self.set_admin_password(new_password)
    digest = BCrypt::Password.create(new_password.to_s)
    set("admin_password_digest", digest)
  end
end
