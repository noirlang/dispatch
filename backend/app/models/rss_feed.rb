class RssFeed < ApplicationRecord
  belongs_to :user
  has_many :rss_items, dependent: :destroy

  validates :url, presence: true, uniqueness: { scope: :user_id }

  def fetch_and_update!
    RssFetchWorker.perform_async(id)
  end
end
