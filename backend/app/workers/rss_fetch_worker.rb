require "faraday"
require "feedjira"
require "nokogiri"

class RssFetchWorker
  include Sidekiq::Worker
  sidekiq_options queue: :rss, retry: 3

  def perform(rss_feed_id)
    feed = RssFeed.find_by(id: rss_feed_id)
    return unless feed

    parsed, real_url = fetch_and_parse(feed.url)
    
    feed.update!(
      title: parsed.title.presence || feed.title.presence || real_url,
      description: parsed.description.presence || feed.description,
      last_fetched_at: Time.current
    )

    parsed.entries.each do |entry|
      guid = entry.entry_id.presence || entry.url.presence || "#{feed.id}-#{entry.title}"
      feed.rss_items.find_or_create_by(guid: guid) do |item|
        item.title        = entry.title
        item.content      = entry.content.presence || entry.summary.presence || ""
        item.url          = entry.url.presence || feed.url
        item.author       = entry.author.presence
        item.published_at = entry.published || Time.current
        item.is_read      = false
        item.starred      = false
      end
    end
  rescue => e
    Rails.logger.error "RSS fetch failed for feed #{rss_feed_id}: #{e.message}"
  end

  private

  def fetch_and_parse(url)
    conn = Faraday.new do |f|
      f.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Dispatch/2.0 RSS Reader"
      f.headers["Accept"] = "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
      f.options.timeout = 10
      f.options.open_timeout = 5
      f.adapter Faraday.default_adapter
    end

    current_url = url
    res = nil
    
    # Follow redirects up to 3 times
    3.times do
      res = conn.get(current_url)
      if [301, 302, 307, 308].include?(res.status) && res.headers["location"]
        current_url = URI.join(current_url, res.headers["location"]).to_s
      else
        break
      end
    end

    begin
      return [Feedjira.parse(res.body), current_url]
    rescue => e
      # Try auto-discovering RSS feed link from HTML page
      doc = Nokogiri::HTML(res.body)
      feed_link = doc.css("link[type*=\"rss\"], link[type*=\"atom\"]").first&.[]("href")
      if feed_link.present?
        target_url = URI.join(current_url, feed_link).to_s
        res2 = conn.get(target_url)
        return [Feedjira.parse(res2.body), target_url]
      end
      raise e
    end
  end
end
