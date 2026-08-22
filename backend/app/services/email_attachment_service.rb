# frozen_string_literal: true

require "fileutils"
require "securerandom"

class EmailAttachmentService
  MAX_FILE_SIZE = 25.megabytes
  STORAGE_DIR = Rails.root.join("public", "uploads", "attachments").freeze

  # Save uploaded file safely with magic-byte MIME detection and UUID prefix
  def self.save_uploaded_file(file)
    FileUtils.mkdir_p(STORAGE_DIR)

    file_size = file.size rescue File.size(file.tempfile.path)
    if file_size > MAX_FILE_SIZE
      raise "Dosya boyutu çok büyük (Maksimum 25MB e-posta eki yüklenebilir)."
    end

    original_filename = file.original_filename.to_s.gsub(/[^a-zA-Z0-9._\-]/, "_").presence || "ek_dosya"
    extension = File.extname(original_filename).downcase
    content_type = Marcel::MimeType.for(file.tempfile, name: original_filename) || "application/octet-stream"

    # Generate safe unique filename
    unique_id = SecureRandom.hex(12)
    stored_filename = "#{unique_id}_#{original_filename}"
    target_path = STORAGE_DIR.join(stored_filename)

    # Copy file to storage directory
    FileUtils.cp(file.tempfile.path, target_path)
    File.chmod(0644, target_path)

    is_image = content_type.start_with?("image/")

    {
      "id"           => unique_id,
      "filename"     => original_filename,
      "content_type" => content_type,
      "size"         => file_size,
      "is_image"     => is_image,
      "url"          => "/uploads/attachments/#{stored_filename}",
      "path"         => target_path.to_s
    }
  end

  # Save raw attachment binary (from incoming mailboxes)
  def self.save_raw_attachment(filename, content, mime_type = nil)
    FileUtils.mkdir_p(STORAGE_DIR)

    original_filename = filename.to_s.gsub(/[^a-zA-Z0-9._\-]/, "_").presence || "ek_dosya"
    content_type = mime_type.presence || Marcel::MimeType.for(content, name: original_filename) || "application/octet-stream"

    unique_id = SecureRandom.hex(12)
    stored_filename = "#{unique_id}_#{original_filename}"
    target_path = STORAGE_DIR.join(stored_filename)

    File.binwrite(target_path, content)
    File.chmod(0644, target_path)

    file_size = content.bytesize
    is_image = content_type.start_with?("image/")

    {
      "id"           => unique_id,
      "filename"     => original_filename,
      "content_type" => content_type,
      "size"         => file_size,
      "is_image"     => is_image,
      "url"          => "/uploads/attachments/#{stored_filename}",
      "path"         => target_path.to_s
    }
  end
end
