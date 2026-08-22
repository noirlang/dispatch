require "openssl"

class ServerConfig < ApplicationRecord
  before_create :generate_dkim_keys_if_missing

  def self.current
    first_or_create!(
      domain: "dispatch.local",
      mail_subdomain: "mail",
      ipv4: "127.0.0.1",
      enable_ipv6: false,
      mode: "local_development",
      dkim_selector: "mail"
    )
  end

  def maildomain
    "#{mail_subdomain}.#{domain}"
  end

  def dkim_dns_p_value
    return "" if dkim_public_key.blank?
    # Extract base64 public key body without headers
    dkim_public_key
      .gsub("-----BEGIN PUBLIC KEY-----", "")
      .gsub("-----END PUBLIC KEY-----", "")
      .gsub("\n", "")
      .strip
  end

  def dns_records
    records = []

    # A Record for mail subdomain
    records << {
      type: "A",
      name: mail_subdomain,
      full_name: "#{mail_subdomain}.#{domain}",
      content: ipv4.presence || "127.0.0.1",
      ttl: "Auto",
      proxy_status: false,
      description: "Mail server host IPv4 address (Cloudflare Proxy must be OFF / DNS only)"
    }

    # AAAA Record if enabled
    if enable_ipv6 && ipv6.present?
      records << {
        type: "AAAA",
        name: mail_subdomain,
        full_name: "#{mail_subdomain}.#{domain}",
        content: ipv6,
        ttl: "Auto",
        proxy_status: false,
        description: "Mail server host IPv6 address (Cloudflare Proxy must be OFF / DNS only)"
      }
    end

    # MX Record
    records << {
      type: "MX",
      name: "@",
      full_name: domain,
      content: maildomain,
      priority: 10,
      ttl: "Auto",
      proxy_status: nil,
      description: "Mail exchanger record pointing incoming mail to #{maildomain}"
    }

    # SPF Record
    spf_parts = ["v=spf1", "mx", "a:#{maildomain}"]
    spf_parts << "ip4:#{ipv4}" if ipv4.present?
    spf_parts << "ip6:#{ipv6}" if enable_ipv6 && ipv6.present?
    spf_parts << "-all"
    records << {
      type: "TXT",
      name: "@",
      full_name: domain,
      content: spf_parts.join(" "),
      ttl: "Auto",
      proxy_status: nil,
      description: "Sender Policy Framework (SPF) whitelist"
    }

    # DKIM Record
    selector = dkim_selector.presence || "mail"
    records << {
      type: "TXT",
      name: "#{selector}._domainkey",
      full_name: "#{selector}._domainkey.#{domain}",
      content: "v=DKIM1; k=rsa; p=#{dkim_dns_p_value}",
      ttl: "Auto",
      proxy_status: nil,
      description: "DomainKeys Identified Mail (DKIM) public cryptographic signature"
    }

    # DMARC Record
    records << {
      type: "TXT",
      name: "_dmarc",
      full_name: "_dmarc.#{domain}",
      content: "v=DMARC1; p=reject; rua=mailto:postmaster@#{domain}; fo=1",
      ttl: "Auto",
      proxy_status: nil,
      description: "Domain-based Message Authentication, Reporting & Conformance policy"
    }

    records
  end

  def bind_zone_export
    dns_records.map do |r|
      if r[:type] == "MX"
        "#{r[:name]}\t300\tIN\tMX\t#{r[:priority]}\t#{r[:content]}."
      else
        "#{r[:name]}\t300\tIN\t#{r[:type]}\t\"#{r[:content]}\""
      end
    end.join("\n")
  end

  def generate_dkim_keys!
    rsa_key = OpenSSL::PKey::RSA.new(2048)
    self.dkim_private_key = rsa_key.to_pem
    self.dkim_public_key = rsa_key.public_key.to_pem
  end

  private

  def generate_dkim_keys_if_missing
    generate_dkim_keys! if dkim_public_key.blank?
  end
end
