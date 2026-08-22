class DashboardCard < ApplicationRecord
  belongs_to :user
  belongs_to :email, optional: true

  TYPES = %w[invoice tracking ticket bank verification travel otp order meeting general].freeze
  PRIORITIES = %w[high medium low].freeze

  validates :card_type, inclusion: { in: TYPES }

  scope :active,    -> { where(dismissed: false) }
  scope :by_priority, -> {
    order(
      Arel.sql("CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END"),
      created_at: :desc
    )
  }
end
