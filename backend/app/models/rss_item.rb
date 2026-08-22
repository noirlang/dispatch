class RssItem < ApplicationRecord
  belongs_to :rss_feed

  validates :guid, uniqueness: { scope: :rss_feed_id }

  scope :unread,   -> { where(is_read: false) }
  scope :starred,  -> { where(starred: true) }
  scope :recent,   -> { order(published_at: :desc) }
end
