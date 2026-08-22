class Api::V1::SenderProfilesController < Api::V1::BaseController
  skip_before_action :authenticate!, only: [:avatar]

  # GET /api/v1/sender_profiles/avatar?email=foo@bar.com
  def avatar
    email = params[:email].to_s.downcase.strip
    render json: Email::SenderAvatarService.for(email)
  end

  # POST /api/v1/sender_profiles/update_avatar
  def update_avatar
    email = params[:email].to_s.downcase.strip
    return render json: { error: "E-posta adresi zorunludur." }, status: :bad_request if email.blank?

    # Check if target email belongs to a registered Dispatch user other than current_user
    if User.exists?(email: email) && current_user&.email&.downcase&.strip != email
      return render json: {
        error: "Bu kullanıcı kayıtlı bir Dispatch kullanıcısıdır. Profil fotoğrafı yalnızca hesap sahibi tarafından değiştirilebilir."
      }, status: :forbidden
    end

    file      = params[:file] || params[:avatar] || params[:image]
    avatar_url = params[:avatar_url].to_s.strip

    if file.blank? && avatar_url.blank?
      return render json: { error: "Lütfen bir resim dosyası seçin veya görsel bağlantısı (URL) girin." }, status: :unprocessable_entity
    end

    profile = SenderProfile.find_or_initialize_by(email: email)

    if file.present?
      # C4 Fix: Use AvatarUploadService which enforces magic-byte MIME validation
      # Create a temporary user-like struct to satisfy the service interface
      tmp_holder = Struct.new(:id, :email, :name, :avatar_path).new(
        Digest::MD5.hexdigest(email)[0..7],
        email,
        profile.display_name || email,
        nil
      )
      result = Email::AvatarUploadService.call_for_profile(email, file)
      if result.success?
        profile.avatar_url = result.path
      else
        return render json: { error: result.error }, status: :unprocessable_entity
      end
    elsif avatar_url.present?
      # M3 Fix: Validate URL scheme and block dangerous/internal URLs
      unless safe_avatar_url?(avatar_url)
        return render json: { error: "Geçersiz veya güvensiz görsel bağlantısı." }, status: :unprocessable_entity
      end
      profile.avatar_url = avatar_url
    end

    profile.display_name = params[:display_name].to_s.strip.first(100) if params[:display_name].present?
    profile.save!

    # If any registered user has this email, sync their user account avatar too
    matching_user = User.find_by(email: email)
    matching_user&.update!(avatar_path: profile.avatar_url)

    render json: {
      email: profile.email,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      message: "Fotoğraf başarıyla güncellendi."
    }
  rescue => e
    render json: { error: "Fotoğraf kaydedilirken hata oluştu: #{e.message}" }, status: :unprocessable_entity
  end

  private

  # M3 Fix: Only allow http/https URLs pointing to external public hosts
  BLOCKED_SCHEMES = %w[javascript data vbscript file].freeze
  BLOCKED_IP_RANGES = [
    IPAddr.new("127.0.0.0/8"),
    IPAddr.new("10.0.0.0/8"),
    IPAddr.new("172.16.0.0/12"),
    IPAddr.new("192.168.0.0/16"),
    IPAddr.new("169.254.0.0/16"),
  ].freeze

  def safe_avatar_url?(url)
    uri = URI.parse(url.to_s.strip)
    return false unless %w[http https].include?(uri.scheme)
    return false if uri.host.blank?
    ip = IPSocket.getaddress(uri.host) rescue nil
    return false if ip && BLOCKED_IP_RANGES.any? { |r| r.include?(IPAddr.new(ip)) }
    true
  rescue
    false
  end
end
