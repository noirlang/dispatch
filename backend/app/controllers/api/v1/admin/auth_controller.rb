class Api::V1::Admin::AuthController < ActionController::API
  def login
    password = params[:password].to_s
    if SystemConfig.admin_password_valid?(password)
      token = JwtHelper.encode(role: "admin", is_admin: true)
      render json: {
        token: token,
        message: "Yönetici girişi başarılı"
      }
    else
      render json: { error: "Geçersiz yönetici şifresi!" }, status: :unauthorized
    end
  end

  def me
    token = request.headers["Authorization"]&.split(" ")&.last
    payload = JwtHelper.decode(token)
    if payload && payload["role"] == "admin"
      render json: { is_admin: true, valid: true }
    else
      render json: { is_admin: false, valid: false }, status: :unauthorized
    end
  end
end
