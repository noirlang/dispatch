class Email::AvatarUploadService
  Result = Struct.new(:success?, :path, :error)

  ALLOWED_TYPES = %w[image/jpeg image/png image/gif image/webp].freeze
  ALLOWED_EXTENSIONS = %w[.jpg .jpeg .png .gif .webp].freeze
  MAX_SIZE = 8 * 1024 * 1024 # 8MB

  def self.call(user, file)
    return Result.new(false, nil, "Dosya bulunamadı") if file.nil?

    file_size = file.respond_to?(:size) ? file.size : (file.respond_to?(:tempfile) ? file.tempfile.size : 0)
    return Result.new(false, nil, "Dosya boyutu çok büyük (Max 8MB)") if file_size > MAX_SIZE

    # Determine MIME type safely via magic bytes inspection
    content_type = file.respond_to?(:content_type) ? file.content_type : nil
    detected_mime = if file.respond_to?(:tempfile)
                      Marcel::MimeType.for(file.tempfile, name: file.respond_to?(:original_filename) ? file.original_filename : nil)
                    elsif file.respond_to?(:path)
                      Marcel::MimeType.for(Pathname.new(file.path))
                    end
    mime = (detected_mime.presence || content_type.presence || "").downcase

    # Ensure valid raster image type (block executable / SVG script vectors)
    unless ALLOWED_TYPES.include?(mime)
      return Result.new(false, nil, "Geçersiz dosya türü. Lütfen geçerli bir JPG, PNG, WEBP veya GIF görseli yükleyin.")
    end

    dir = Rails.root.join("public/avatars")
    FileUtils.mkdir_p(dir)

    orig_name = file.respond_to?(:original_filename) ? file.original_filename : "avatar.png"
    clean_ext = File.extname(orig_name.to_s).downcase
    ext = ALLOWED_EXTENSIONS.include?(clean_ext) ? clean_ext : ".png"
    filename = "#{user.id}_#{SecureRandom.hex(12)}#{ext}"
    path = dir.join(filename)

    if file.respond_to?(:tempfile) && File.exist?(file.tempfile.path)
      FileUtils.cp(file.tempfile.path, path)
    elsif file.respond_to?(:read)
      file.rewind if file.respond_to?(:rewind)
      File.binwrite(path, file.read)
    elsif file.respond_to?(:path) && File.exist?(file.path)
      FileUtils.cp(file.path, path)
    end

    avatar_url = "/avatars/#{filename}"
    user.update!(avatar_path: avatar_url)

    profile = SenderProfile.find_or_initialize_by(email: user.email.downcase.strip)
    profile.avatar_url = avatar_url
    profile.display_name = user.name if profile.display_name.blank?
    profile.save!

    Result.new(true, avatar_url, nil)
  rescue => e
    Result.new(false, nil, "Fotoğraf kaydedilirken hata oluştu: #{e.message}")
  end
end
