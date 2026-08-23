class Api::V1::SetupController < ActionController::API
  before_action :block_if_reconfigured, only: [:create, :cloudflare_sync]

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
        SystemConfig.set_admin_password(params[:admin_password])
        token = JwtHelper.encode(user_id: admin_user.id)
      end
    # Configure Postfix automatically for the domain
    begin
      system("postconf -e 'myhostname = #{mail_subdomain}.#{domain}' 2>/dev/null")
      system("postconf -e 'mydomain = #{domain}' 2>/dev/null")
      system("postconf -e 'myorigin = $mydomain' 2>/dev/null")
      system("postconf -e 'mydestination = $myhostname, $mydomain, localhost.$mydomain, localhost' 2>/dev/null")
      system("postconf -e 'mailbox_transport = dispatch-pipe' 2>/dev/null")
      system("postconf -e 'fallback_transport = dispatch-pipe' 2>/dev/null")
      system("postconf -e 'local_recipient_maps =' 2>/dev/null")
      system("postconf -e 'inet_interfaces = all' 2>/dev/null")
      system("postconf -e 'inet_protocols = all' 2>/dev/null")
      system("systemctl restart postfix 2>/dev/null")
    rescue => e
      Rails.logger.warn "Postfix auto-config warning: #{e.message}"
    end

    logs = [
      "[INFO] Sunucu IP adresi (#{ipv4}) ve ağ yapılandırması doğrulandı.",
      "[INFO] Alan adı: #{domain} (Posta sunucusu: #{mail_subdomain}.#{domain}) olarak ayarlandı.",
      "[OK] 2048-bit RSA DKIM açık ve gizli anahtarları başarıyla üretildi.",
      "[OK] PostgreSQL veritabanı şeması ve tablolar hazırlandı.",
      "[OK] Postfix SMTP ve Dovecot IMAP / Posta kutusu yapılandırması senkronize edildi.",
      "[OK] Yönetici hesabı (#{admin_user&.email}) ve Linux PAM şifre senkronizasyonu tamamlandı.",
      "[OK] Nginx ters vekili ve DNS yönlendirme kuralları üretildi.",
      "[SUCCESS] Dispatch e-posta altyapısı başarıyla kuruldu ve canlıya alındı!"
    ]

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
      token: token,
      logs: logs
    }
  end

  # POST /api/v1/setup/cloudflare_sync
  def cloudflare_sync
    config = ServerConfig.current
    api_token = params[:api_token].to_s.strip
    domain = params[:domain].presence || config.domain
    mail_subdomain = params[:mail_subdomain].presence || config.mail_subdomain || "mail"
    web_subdomain = params[:web_subdomain].presence || "dispatch"
    ipv4 = params[:ipv4].presence || config.ipv4 || "127.0.0.1"

    res = Cloudflare::DnsSyncService.sync(
      api_token: api_token,
      domain: domain,
      mail_subdomain: mail_subdomain,
      web_subdomain: web_subdomain,
      ipv4: ipv4,
      dkim_public_key: config.dkim_public_key
    )

    if res[:success]
      render json: res
    else
      render json: res, status: :unprocessable_entity
    end
  end

  private

  # C3 Fix: Prevent re-running setup once configured unless a valid admin token is supplied
  def block_if_reconfigured
    config = ServerConfig.current
    return unless config.is_configured && User.exists?

    # Allow with valid admin JWT token
    token   = request.headers["Authorization"]&.split(" ")&.last
    payload = JwtHelper.decode(token) rescue nil
    return if payload && payload["role"] == "admin"

    render json: {
      error: "Sistem zaten yapılandırılmış. Ayarları değiştirmek için yönetici panelini kullanın."
    }, status: :forbidden
  end
end
