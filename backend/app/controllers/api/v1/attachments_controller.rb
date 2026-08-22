module Api
  module V1
    class AttachmentsController < BaseController
      # POST /api/v1/attachments/upload
      def upload
        files = Array(params[:file] || params[:files]).compact
        return render json: { error: "Dosya seçilmedi." }, status: :bad_request if files.empty?

        results = []
        files.each do |file|
          next unless file.is_a?(ActionDispatch::Http::UploadedFile)
          attachment_meta = EmailAttachmentService.save_uploaded_file(file)
          results << attachment_meta
        end


        if results.empty?
          render json: { error: "Geçerli bir dosya yüklenemedi." }, status: :unprocessable_entity
        else
          render json: {
            attachments: results,
            attachment: results.first
          }, status: :created
        end
      rescue => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # GET /api/v1/attachments/download?file=...&filename=...
      def download
        target_file = params[:file].to_s.strip
        # Strict path traversal protection
        sanitized_file = File.basename(target_file)
        file_path = Rails.root.join("public", "uploads", "attachments", sanitized_file)

        unless File.exist?(file_path)
          return render json: { error: "Dosya bulunamadı." }, status: :not_found
        end

        mime_type = Marcel::MimeType.for(Pathname.new(file_path)) || "application/octet-stream"
        download_name = params[:filename].presence || sanitized_file.sub(/\A[a-f0-9]+_/, "")

        response.headers["Content-Security-Policy"] = "default-src 'none'"
        response.headers["X-Content-Type-Options"] = "nosniff"

        send_file file_path,
                  filename: download_name,
                  type: mime_type,
                  disposition: params[:inline] == "true" ? "inline" : "attachment"
      end
    end
  end
end
