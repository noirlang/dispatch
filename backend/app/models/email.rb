class Email < ApplicationRecord
  belongs_to :user
  belongs_to :thread, class_name: "EmailThread", optional: true

  FOLDERS = %w[inbox approvals sent drafts trash].freeze
  STATUSES = %w[pending approved rejected].freeze

  validates :folder, inclusion: { in: FOLDERS }

  scope :inbox,     -> { where(folder: "inbox") }
  scope :approvals, -> { where(folder: "approvals") }
  scope :unread,    -> { where(is_read: false) }
end
