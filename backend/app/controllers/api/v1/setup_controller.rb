class Api::V1::SetupController < ActionController::API
  # GET /api/v1/setup/status
  def status
    config = ServerConfig.current
    # Try detecting host ip or fallback
    detected_ip = request.remote_ip.presence || "127.0.0.1"

    render json: {
      is_configured: config.is_configured,
      domain: config.domain,
      mail_subdomain: config.mail_subdomain,
      ipv4: config.ipv4.presence || detected_ip,
      ipv6: config.ipv6,
      enable_ipv6: config.enable_ipv6,
      mode: config.mode,
      has_users: User.exists?,
      detected_ip: detected_ip
    }
  end

  # POST /api/v1/setup
  def create
    config = ServerConfig.current

    domain = params[:domain].to_s.strip.downcase
    domain = "dispatch.local" if domain.blank?

    mail_subdomain = params[:mail_subdomain].to_s.strip.downcase
    mail_subdomain = "mail" if mail_subdomain.blank?

    ipv4 = params[:ipv4].to_s.strip
    ipv4 = "127.0.0.1" if ipv4.blank?

    enable_ipv6 = ActiveRecord::Type::Boolean.new.cast(params[:enable_ipv6]) || false
    ipv6 = enable_ipv6 ? params[:ipv6].to_s.strip : nil

    mode = params[:mode].presence || "local_development"

    config.assign_attributes(
      domain: domain,
      mail_subdomain: mail_subdomain,
      ipv4: ipv4,
      enable_ipv6: enable_ipv6,
      ipv6: ipv6,
      mode: mode,
      is_configured: true
    )

    config.generate_dkim_keys! if config.dkim_public_key.blank? || params[:regenerate_dkim]
    config.save!

    # Optional: Create Initial Admin User if provided
    token = nil
    admin_user = nil
    if params[:admin_name].present? && params[:admin_email].present? && params[:admin_password].present?
      email = params[:admin_email].to_s.strip.downcase
      email = "#{email}@#{domain}" unless email.include?("@")

      admin_user = User.find_or_initialize_by(email: email)
      admin_user.name = params[:admin_name].to_s.strip
      admin_user.password = params[:admin_password]
      admin_user.approval_system_enabled = true
      admin_user.spy_pixel_blocking = true
      if admin_user.save
        token = JwtHelper.encode(user_id: admin_user.id)
      end
    end

    render json: {
      message: "Setup completed successfully",
      config: {
        domain: config.domain,
        mail_subdomain: config.mail_subdomain,
        maildomain: config.maildomain,
        ipv4: config.ipv4,
        enable_ipv6: config.enable_ipv6,
        ipv6: config.ipv6,
        mode: config.mode,
        is_configured: config.is_configured
      },
      dns_records: config.dns_records,
      bind_zone: config.bind_zone_export,
      user: admin_user ? { id: admin_user.id, name: admin_user.name, email: admin_user.email } : nil,
      token: token
    }
  end

  # GET /api/v1/setup/dns
  def dns
    config = ServerConfig.current
    render json: {
      domain: config.domain,
      mail_subdomain: config.mail_subdomain,
      maildomain: config.maildomain,
      records: config.dns_records,
      bind_zone: config.bind_zone_export,
      cloudflare_instructions: [
        "1. Log into your Cloudflare Dashboard and select your domain: #{config.domain}",
        "2. Navigate to DNS -> Records",
        "3. Add the A record (and AAAA if IPv6 enabled). IMPORTANT: Set Proxy status to 'DNS Only' (Grey Cloud, not Orange Cloud).",
        "4. Add the MX record with priority 10 pointing to #{config.maildomain}",
        "5. Add the SPF, DKIM, and DMARC TXT records exactly as shown below.",
        "6. In Cloudflare, make sure TTL is set to Auto."
      ]
    }
  end
end
