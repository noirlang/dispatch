class Api::V1::AuthController < ActionController::API
  before_action :authenticate!, only: [:logout, :me]

  def registration_status
    mode = SystemConfig.get("registration_mode", "public")
    domain = ServerConfig.current&.domain.presence || "dispatch.local"
    render json: {
      mode: mode,
      allow_registration: mode != "admin_only",
      requires_invite: mode == "invite_only",
      domain: domain
    }
  end

  def verify_invite
    code = params[:invite_code].to_s.strip.upcase
    if InviteCode.valid_code?(code)
      render json: { valid: true, message: "Davet kodu geçerli." }
    else
      render json: { valid: false, error: "Geçersiz veya süresi dolmuş davet kodu!" }, status: :unprocessable_entity
    end
  end

  def register
    mode = SystemConfig.get("registration_mode", "public")

    if mode == "admin_only"
      return render json: { error: "Bu sunucuda açık kayıtlar kapalıdır. Lütfen sistem yöneticisinden hesap talep edin." }, status: :forbidden
    end

    if mode == "invite_only"
      code = params[:invite_code].to_s.strip.upcase
      unless InviteCode.valid_code?(code)
        return render json: { error: "Kayıt için geçerli bir davet kodu gereklidir!" }, status: :unprocessable_entity
      end
    end

    clean_email = normalize_email(params[:email].presence || params[:username])
    user = User.new(register_params.merge(email: clean_email))
    if user.save
      InviteCode.use_code!(params[:invite_code]) if mode == "invite_only"
      token = JwtHelper.encode(user_id: user.id)
      render json: { token: token, user: user_json(user) }, status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def login
    clean_email = normalize_email(params[:email].presence || params[:username])
    user = User.find_by(email: clean_email)
    if user&.authenticate(params[:password])
      token = JwtHelper.encode(user_id: user.id)
      render json: { token: token, user: user_json(user) }
    else
      render json: { error: "Geçersiz kullanıcı adı veya şifre" }, status: :unauthorized
    end
  end

  def check_email
    clean_email = normalize_email(params[:email].presence || params[:username])
    user = User.find_by(email: clean_email)
    if user
      render json: {
        exists: true,
        name: user.name,
        email: user.email,
        username: user.email.split("@").first,
        avatar_path: user.avatar_path
      }
    else
      render json: {
        exists: false,
        error: "Bu kullanıcı adına ait bir hesap bulunamadı."
      }, status: :not_found
    end
  end

  def logout
    render json: { message: "Logged out" }
  end

  def me
    render json: { user: user_json(current_user) }
  end

  private

  def normalize_email(input)
    val = input.to_s.downcase.strip
    return "" if val.blank?
    if val.include?("@")
      val
    else
      domain = ServerConfig.current&.domain.presence || "dispatch.local"
      "#{val}@#{domain}"
    end
  end

  def register_params
    params.permit(:name, :email, :password, :password_confirmation)
  end

  def user_json(user)
    {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_path: user.avatar_path,
      default_signature: user.default_signature,
      ai_configured: user.ai_configured?,
      ai_provider: user.ai_provider,
      ai_model: user.ai_model,
      approval_system_enabled: user.approval_system_enabled,
      spy_pixel_blocking: user.spy_pixel_blocking
    }
  end

  def authenticate!
    token = request.headers["Authorization"]&.split(" ")&.last
    payload = JwtHelper.decode(token)
    @current_user = User.find_by(id: payload&.dig("user_id"))
    render json: { error: "Unauthorized" }, status: :unauthorized unless @current_user
  end

  def current_user
    @current_user
  end
end
