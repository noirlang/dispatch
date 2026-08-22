class CalendarEvent < ApplicationRecord
  belongs_to :user
  belongs_to :email, optional: true

  SOURCES = %w[manual ai_extracted email].freeze
  validates :title, presence: true
  validates :starts_at, presence: true

  scope :upcoming, -> { where("starts_at >= ?", Time.current).order(:starts_at) }
  scope :today,    -> { where(starts_at: Time.current.beginning_of_day..Time.current.end_of_day) }
end
