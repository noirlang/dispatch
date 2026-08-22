require "net/http"
require "json"
require "uri"

class Cloudflare::DnsSyncService
  CF_API_BASE = "https://api.cloudflare.com/client/v4"

  def self.sync(api_token:, domain:, mail_subdomain: "mail", web_subdomain: "dispatch", ipv4:, dkim_public_key: nil)
    return { success: false, error: "API Token ve Domain zorunludur." } if api_token.blank? || domain.blank?

    # 1. Get Zone ID for domain
    zone_id = get_zone_id(api_token, domain)
    return { success: false, error: "'#{domain}' için Cloudflare Zone ID bulunamadı. Token izinlerini kontrol edin." } unless zone_id

    # Prepare all 6 required DNS records
    maildomain = "#{mail_subdomain}.#{domain}"
    webdomain = web_subdomain.present? && web_subdomain != "@" ? "#{web_subdomain}.#{domain}" : domain

    records_to_sync = [
      # 1. Webmail A record (DNS Only / No proxy for initial setup or custom proxy)
      { type: "A", name: webdomain, content: ipv4, proxied: false, ttl: 1 },
      
      # 2. Mail server A record (Must be DNS Only / proxied: false)
      { type: "A", name: maildomain, content: ipv4, proxied: false, ttl: 1 },
      
      # 3. MX Record
      { type: "MX", name: domain, content: maildomain, priority: 10, ttl: 1 },
      
      # 4. SPF TXT Record
      { type: "TXT", name: domain, content: "v=spf1 mx a:#{maildomain} ip4:#{ipv4} ~all", ttl: 1 },
      
      # 5. DMARC TXT Record
      { type: "TXT", name: "_dmarc.#{domain}", content: "v=DMARC1; p=reject; rua=mailto:postmaster@#{domain}; fo=1", ttl: 1 }
    ]

    # 6. DKIM Record if key provided
    if dkim_public_key.present?
      clean_dkim = dkim_public_key.gsub(/-----[A-Z ]+-----/, "").gsub(/\s+/, "")
      records_to_sync << {
        type: "TXT",
        name: "#{mail_subdomain}._domainkey.#{domain}",
        content: "v=DKIM1; k=rsa; p=#{clean_dkim}",
        ttl: 1
      }
    end

    logs = []
    success_count = 0

    records_to_sync.each do |rec|
      res = upsert_dns_record(api_token, zone_id, rec)
      if res[:success]
        success_count += 1
        logs << "✔ #{rec[:type]} (#{rec[:name]} -> #{rec[:content]}) eklendi/güncellendi."
      else
        logs << "✖ #{rec[:type]} (#{rec[:name]}): #{res[:error]}"
      end
    end

    {
      success: success_count > 0,
      zone_id: zone_id,
      success_count: success_count,
      total: records_to_sync.size,
      logs: logs,
      message: "#{success_count}/#{records_to_sync.size} Cloudflare DNS kaydı başarıyla eşitlendi!"
    }
  rescue => e
    { success: false, error: e.message }
  end

  private

  def self.get_zone_id(api_token, domain)
    uri = URI("#{CF_API_BASE}/zones?name=#{CGI.escape(domain)}&status=active")
    req = Net::HTTP::Get.new(uri)
    req["Authorization"] = "Bearer #{api_token}"
    req["Content-Type"] = "application/json"

    res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }
    json = JSON.parse(res.body)
    json.dig("result", 0, "id")
  rescue
    nil
  end

  def self.upsert_dns_record(api_token, zone_id, record)
    # Check existing
    uri = URI("#{CF_API_BASE}/zones/#{zone_id}/dns_records?name=#{CGI.escape(record[:name])}&type=#{record[:type]}")
    req = Net::HTTP::Get.new(uri)
    req["Authorization"] = "Bearer #{api_token}"
    req["Content-Type"] = "application/json"

    res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }
    json = JSON.parse(res.body)
    existing_id = json.dig("result", 0, "id")

    payload = {
      type: record[:type],
      name: record[:name],
      content: record[:content],
      ttl: record[:ttl] || 1
    }
    payload[:priority] = record[:priority] if record[:priority]
    payload[:proxied] = record[:proxied] unless record[:proxied].nil?

    if existing_id
      # Update
      put_uri = URI("#{CF_API_BASE}/zones/#{zone_id}/dns_records/#{existing_id}")
      put_req = Net::HTTP::Put.new(put_uri)
      put_req["Authorization"] = "Bearer #{api_token}"
      put_req["Content-Type"] = "application/json"
      put_req.body = payload.to_json
      put_res = Net::HTTP.start(put_uri.hostname, put_uri.port, use_ssl: true) { |http| http.request(put_req) }
      put_json = JSON.parse(put_res.body)
      { success: put_json["success"] == true, error: put_json.dig("errors", 0, "message") }
    else
      # Create
      post_uri = URI("#{CF_API_BASE}/zones/#{zone_id}/dns_records")
      post_req = Net::HTTP::Post.new(post_uri)
      post_req["Authorization"] = "Bearer #{api_token}"
      post_req["Content-Type"] = "application/json"
      post_req.body = payload.to_json
      post_res = Net::HTTP.start(post_uri.hostname, post_uri.port, use_ssl: true) { |http| http.request(post_req) }
      post_json = JSON.parse(post_res.body)
      { success: post_json["success"] == true, error: post_json.dig("errors", 0, "message") }
    end
  rescue => e
    { success: false, error: e.message }
  end
end
