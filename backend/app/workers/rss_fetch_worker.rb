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

    # M6 Fix: Validate URL scheme before any network request
    raise "Geçersiz RSS URL: sadece http/https desteklenmektedir." unless safe_rss_url?(url)

    current_url = url
    res = nil

    # Follow redirects up to 3 times — H2 Fix: validate each redirect target
    3.times do
      res = conn.get(current_url)
      if [301, 302, 307, 308].include?(res.status) && res.headers["location"]
        redirect_target = URI.join(current_url, res.headers["location"]).to_s
        # H2 Fix: Block redirects to internal/private networks
        raise "SSRF: Yönlendirme hedefi güvensiz bir adrese işaret ediyor." unless safe_rss_url?(redirect_target)
        current_url = redirect_target
      else
        break
      end
    end

    begin
      return [Feedjira.parse(res.body), current_url]
    rescue => e
      # Try auto-discovering RSS feed link from HTML page
      # L6 Fix: Use NONET+NOENT flags to prevent XXE when parsing external HTML
      doc = Nokogiri::HTML(res.body, nil, "UTF-8", Nokogiri::XML::ParseOptions::NONET | Nokogiri::XML::ParseOptions::NOENT)
      feed_link = doc.css("link[type*=\"rss\"], link[type*=\"atom\"]").first&.[]("href")

      if feed_link.present?
        target_url = URI.join(current_url, feed_link).to_s
        raise "SSRF: Bulunan feed linki güvensiz bir adrese işaret ediyor." unless safe_rss_url?(target_url)
        res2 = conn.get(target_url)
        return [Feedjira.parse(res2.body), target_url]
      end
      raise e
    end
  end

  # H2+M6 Fix: Block private/internal IP ranges and non-http(s) schemes
  SSRF_BLOCKED_RANGES = [
    IPAddr.new("127.0.0.0/8"),
    IPAddr.new("10.0.0.0/8"),
    IPAddr.new("172.16.0.0/12"),
    IPAddr.new("192.168.0.0/16"),
    IPAddr.new("169.254.0.0/16"),
    IPAddr.new("0.0.0.0/8"),
    IPAddr.new("::1/128"),
    IPAddr.new("fc00::/7"),
    IPAddr.new("fe80::/10"),
  ].freeze

  def safe_rss_url?(url)
    self.class.safe_rss_url?(url)
  end

  def self.safe_rss_url?(url)
    uri = URI.parse(url.to_s.strip)
    return false unless %w[http https].include?(uri.scheme)
    return false if uri.host.blank?
    ip = IPSocket.getaddress(uri.host) rescue nil
    return false if ip && SSRF_BLOCKED_RANGES.any? { |r| r.include?(IPAddr.new(ip)) }
    true
  rescue
    false
  end
end


