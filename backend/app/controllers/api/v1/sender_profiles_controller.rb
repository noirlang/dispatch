class Api::V1::SenderProfilesController < ActionController::API
  # GET /api/v1/sender_profiles/avatar?email=foo@bar.com
  def avatar
    email = params[:email].to_s.downcase.strip
    render json: Email::SenderAvatarService.for(email)
  end
end
