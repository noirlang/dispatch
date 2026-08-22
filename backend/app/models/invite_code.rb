class InviteCode < ApplicationRecord
  validates :code, presence: true, uniqueness: true

  before_validation :generate_code, on: :create

  def self.valid_code?(input_code)
    return false if input_code.blank?
    code_obj = find_by(code: input_code.to_s.strip.upcase, is_active: true)
    return false unless code_obj
    return false if code_obj.expires_at && code_obj.expires_at < Time.current
    return false if code_obj.max_uses.to_i > 0 && code_obj.used_count >= code_obj.max_uses
    true
  end

  def self.use_code!(input_code)
    return false if input_code.blank?
    code_obj = find_by(code: input_code.to_s.strip.upcase, is_active: true)
    return false unless code_obj
    code_obj.increment!(:used_count)
    if code_obj.max_uses.to_i > 0 && code_obj.used_count >= code_obj.max_uses
      code_obj.update(is_active: false)
    end
    true
  end

  private

  def generate_code
    self.code = self.code.presence || "INV-#{SecureRandom.alphanumeric(8).upcase}"
  end
end
