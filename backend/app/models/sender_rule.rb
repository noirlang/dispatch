class SenderRule < ApplicationRecord
  belongs_to :user

  STATUSES = %w[approved blocked important].freeze
  validates :status, inclusion: { in: STATUSES }
  validates :email_address, presence: true

  scope :approved,  -> { where(status: "approved") }
  scope :blocked,   -> { where(status: "blocked") }
  scope :important, -> { where(status: "important") }
end
