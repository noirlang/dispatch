class Email::AvatarUploadService
  Result = Struct.new(:success?, :path, :error)

  ALLOWED_TYPES = %w[image/jpeg image/png image/gif image/webp].freeze
  MAX_SIZE = 5 * 1024 * 1024 # 5MB

  def self.call(user, file)
    return Result.new(false, nil, "File too large") if file.size > MAX_SIZE

    mime = Marcel::MimeType.for(file)
    return Result.new(false, nil, "Invalid file type") unless ALLOWED_TYPES.include?(mime)

    dir = Rails.root.join("public/avatars")
    FileUtils.mkdir_p(dir)
    filename = "#{user.id}_#{SecureRandom.hex(8)}#{File.extname(file.original_filename)}"
    path = dir.join(filename)
    File.binwrite(path, file.read)

    user.update!(avatar_path: "/avatars/#{filename}")
    Result.new(true, "/avatars/#{filename}", nil)
  rescue => e
    Result.new(false, nil, e.message)
  end
end
