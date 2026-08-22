class ContactGroup < ApplicationRecord
  belongs_to :user

  validates :name, presence: true, uniqueness: { scope: :user_id, case_sensitive: false }

  before_save :clean_data

  def member_list
    Array(members).map(&:to_s).reject(&:blank?)
  end

  private

  def clean_data
    self.name = name.to_s.strip.delete_prefix("@")
    self.members = Array(members).map { |m| m.to_s.downcase.strip }.reject(&:blank?).uniq
  end
end
