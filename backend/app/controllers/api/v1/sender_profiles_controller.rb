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
    return render json: { error: "Email required" }, status: :bad_request if email.blank?

    profile = SenderProfile.find_or_initialize_by(email: email)

    if params[:file].present?
      file = params[:file]
      ext = File.extname(file.original_filename).presence || ".png"
      filename = "sender_#{Digest::MD5.hexdigest(email)}_#{Time.now.to_i}#{ext}"
      dir = Rails.root.join("public/avatars")
      FileUtils.mkdir_p(dir)
      path = dir.join(filename)
      File.open(path, "wb") { |f| f.write(file.read) }
      profile.avatar_url = "/avatars/#{filename}"
    elsif params[:avatar_url].present?
      profile.avatar_url = params[:avatar_url]
    end

    profile.display_name = params[:display_name] if params[:display_name].present?
    profile.save!

    render json: {
      email: profile.email,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url
    }
  end
end
