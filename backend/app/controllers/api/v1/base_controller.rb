class Api::V1::BaseController < ActionController::API
  before_action :authenticate!

  private

  def authenticate!
    token = request.headers["Authorization"]&.split(" ")&.last

    # C5 Fix: Reject tokens that have been blocklisted on logout
    if token.present?
      blocked = Sidekiq.redis { |r| r.exists?("jwt_blocklist:#{token}") } rescue false
      return render json: { error: "Unauthorized" }, status: :unauthorized if blocked
    end

    payload = JwtHelper.decode(token)
    user_id = payload&.dig("user_id") || payload&.dig(:user_id)
    @current_user = User.find_by(id: user_id)
    render json: { error: "Unauthorized" }, status: :unauthorized unless @current_user
  end

  def current_user
    @current_user
  end
end

