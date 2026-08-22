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

    file = params[:file] || params[:avatar] || params[:image]
    avatar_url = params[:avatar_url].to_s.strip

    if file.blank? && avatar_url.blank?
      return render json: { error: "Lütfen bir resim dosyası seçin veya görsel bağlantısı (URL) girin." }, status: :unprocessable_entity
    end

    profile = SenderProfile.find_or_initialize_by(email: email)

    if file.present?
      ext = File.extname(file.original_filename).presence || ".png"
      filename = "sender_#{Digest::MD5.hexdigest(email)}_#{Time.now.to_i}#{ext}"
      dir = Rails.root.join("public/avatars")
      FileUtils.mkdir_p(dir)
      path = dir.join(filename)
      if file.respond_to?(:tempfile) && File.exist?(file.tempfile.path)
        FileUtils.cp(file.tempfile.path, path)
      elsif file.respond_to?(:read)
        file.rewind if file.respond_to?(:rewind)
        File.open(path, "wb") { |f| f.write(file.read) }
      end
      profile.avatar_url = "/avatars/#{filename}"
    elsif avatar_url.present?
      profile.avatar_url = avatar_url
    end

    profile.display_name = params[:display_name] if params[:display_name].present?
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
end
