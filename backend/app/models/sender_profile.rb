class SenderProfile < ApplicationRecord
  validates :email, presence: true, uniqueness: true
  validates :domain, presence: true

  before_validation :extract_domain

  private

  def extract_domain
    self.domain = email.split("@").last.downcase if email.present?
  end
end
