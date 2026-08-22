class RssFetchWorker
  include Sidekiq::Worker
  sidekiq_options queue: :rss, retry: 3

  def perform(rss_feed_id)
    feed = RssFeed.find_by(id: rss_feed_id)
    return unless feed

    parsed = Feedjira.parse(Faraday.get(feed.url).body)
    feed.update!(title: parsed.title, description: parsed.description, last_fetched_at: Time.current)

    parsed.entries.each do |entry|
      feed.rss_items.find_or_create_by(guid: entry.id || entry.url) do |item|
        item.title        = entry.title
        item.content      = entry.content || entry.summary
        item.url          = entry.url
        item.author       = entry.author
        item.published_at = entry.published
        item.is_read      = false
        item.starred      = false
      end
    end
  rescue => e
    Rails.logger.error "RSS fetch failed for feed #{rss_feed_id}: #{e.message}"
    raise
  end
end
