class Email::ImageProxyService
  BLOCKED_RANGES = [
    IPAddr.new("10.0.0.0/8"),
    IPAddr.new("172.16.0.0/12"),
    IPAddr.new("192.168.0.0/16"),
    IPAddr.new("127.0.0.0/8"),
    IPAddr.new("::1/128")
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
    trackers = Rails.cache.fetch("tracker_domains", expires_in: 1.hour) do
      YAML.load_file(Rails.root.join("config/email_trackers.yml")) rescue []
    end
    uri = URI.parse(url)
    trackers.any? { |domain| uri.host&.include?(domain) }
  rescue
    true
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
