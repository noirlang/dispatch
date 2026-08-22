class Email::ImageProxyService
  BLOCKED_RANGES = [
    IPAddr.new("127.0.0.0/8"),
    IPAddr.new("10.0.0.0/8"),
    IPAddr.new("172.16.0.0/12"),
    IPAddr.new("192.168.0.0/16"),
    IPAddr.new("169.254.0.0/16"), # Cloud instance metadata (169.254.169.254)
    IPAddr.new("0.0.0.0/8"),
    IPAddr.new("::1/128"),
    IPAddr.new("fc00::/7"),       # IPv6 Unique Local
    IPAddr.new("fe80::/10")       # IPv6 Link-Local
  ].freeze

  # uBlock Origin / Peter Lowe / EasyPrivacy lists
  REMOTE_FILTER_URLS = [
    "https://raw.githubusercontent.com/easylist/easylist/master/easyprivacy/easyprivacy_trackers.txt",
    "https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&mimetype=plaintext"
  ].freeze

  def self.rewrite_html(html)
    doc = Nokogiri::HTML(html)
    doc.css("img").each do |img|
      src = img["src"]
      next if src.blank? || src.start_with?("data:")
      img["data-original-src"] = src
      img["src"] = "/api/v1/image_proxy?url=#{CGI.escape(src)}"
    end
    doc.to_html
  end

  def self.fetch(url)
    return blank_pixel unless safe_url?(url)
    return blank_pixel if tracker?(url)

    response = Faraday.get(url) { |r| r.options.timeout = 5 }
    { data: response.body, content_type: response.headers["content-type"] || "image/png" }
  rescue
    blank_pixel
  end

  def self.tracker?(url)
    trackers = active_tracker_domains
    uri = URI.parse(url)
    host = uri.host&.downcase
    return true if host.blank?

    trackers.any? { |domain| host == domain || host.end_with?(".#{domain}") }
  rescue
    true
  end

  def self.active_tracker_domains
    Rails.cache.fetch("active_tracker_domains_list", expires_in: 6.hours) do
      list = []
      # 1. Base local tracker domains
      local_file = Rails.root.join("config/email_trackers.yml")
      list += YAML.load_file(local_file) if File.exist?(local_file)

      # 2. Fetch remote uBlock / privacy lists in background or cached
      begin
        res = Faraday.get("https://raw.githubusercontent.com/FadeMind/hosts.extras/master/add.207EasyPrivacy/hosts") { |r| r.options.timeout = 4 }
        if res.success?
          domains = res.body.scan(/^0\.0\.0\.0\s+([a-zA-Z0-9.-]+)/).flatten
          list += domains.take(2000)
        end
      rescue => e
        Rails.logger.warn "Failed to fetch remote uBlock tracker list: #{e.message}"
      end

      list.compact.map(&:downcase).uniq
    end
  end

  def self.safe_url?(url)
    uri = URI.parse(url)
    return false unless %w[http https].include?(uri.scheme)
    ip = IPSocket.getaddress(uri.host)
    BLOCKED_RANGES.none? { |range| range.include?(IPAddr.new(ip)) }
  rescue
    false
  end

  def self.blank_pixel
    pixel = Base64.decode64("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
    { data: pixel, content_type: "image/gif" }
  end
end
