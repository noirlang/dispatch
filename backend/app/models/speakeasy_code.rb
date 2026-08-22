class SpeakeasyCode < ApplicationRecord
  belongs_to :user

  before_create :generate_code

  scope :active, -> { where(used: false).where("expires_at IS NULL OR expires_at > ?", Time.current) }

  def expired?
    expires_at.present? && expires_at < Time.current
  end

  def valid_code?
    !expired? && !(single_use && used)
  end

  private

  def generate_code
    self.code ||= "DISPATCH-#{SecureRandom.alphanumeric(6).upcase}-#{Time.current.year}"
  end
end
