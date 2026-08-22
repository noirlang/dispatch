class Api::V1::BaseController < ActionController::API
  before_action :authenticate!

  private

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
