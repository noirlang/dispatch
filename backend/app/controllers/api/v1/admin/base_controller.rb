class Api::V1::Admin::BaseController < ActionController::API
  before_action :authenticate_admin!

  private

  def authenticate_admin!
    token = request.headers["Authorization"]&.split(" ")&.last
    payload = JwtHelper.decode(token)
    
    if payload.nil? || payload["role"] != "admin"
      render json: { error: "Yönetici yetkisi gerekli. Lütfen giriş yapın." }, status: :unauthorized
    end
  end
end
