class EmailThread < ApplicationRecord
  belongs_to :user
  belongs_to :merged_into, class_name: "EmailThread", optional: true
  has_many :emails, foreign_key: :thread_id

  scope :root, -> { where(merged_into_id: nil) }

  def messages
    all_thread_ids = EmailThread.where(merged_into_id: id).pluck(:id) + [id]
    Email.where(thread_id: all_thread_ids).order(:created_at)
  end
end
