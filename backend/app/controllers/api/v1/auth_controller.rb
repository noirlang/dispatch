class Api::V1::AuthController < ActionController::API
  before_action :authenticate!, only: [:logout, :me]

  def register
    user = User.new(register_params)
    if user.save
      token = JwtHelper.encode(user_id: user.id)
      render json: { token: token, user: user_json(user) }, status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def login
    user = User.find_by(email: params[:email]&.downcase)
    if user&.authenticate(params[:password])
      token = JwtHelper.encode(user_id: user.id)
      render json: { token: token, user: user_json(user) }
    else
      render json: { error: "Invalid email or password" }, status: :unauthorized
    end
  end

  def logout
    render json: { message: "Logged out" }
  end

  def me
    render json: { user: user_json(current_user) }
  end

  private

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
