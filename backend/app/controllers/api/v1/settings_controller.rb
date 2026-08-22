class Api::V1::SettingsController < Api::V1::BaseController
  def show
    render json: settings_json
  end

  def update
    # Handle password change if requested
    if params[:password].present?
      if params[:current_password].blank? || !current_user.authenticate(params[:current_password])
        return render json: { error: "Current password is incorrect" }, status: :unprocessable_entity
      end
      current_user.password = params[:password]
      current_user.password_confirmation = params[:password_confirmation]
    end

    current_user.assign_attributes(settings_params)
    
    # Update encrypted API keys separately if provided
    current_user.gemini_key = params[:gemini_key] if params[:gemini_key].present?
    current_user.claude_key = params[:claude_key] if params[:claude_key].present?
    current_user.openai_key = params[:openai_key] if params[:openai_key].present?
    
    if current_user.save
      render json: settings_json
    else
      render json: { errors: current_user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def test_ai
    provider = params[:provider].presence || current_user.ai_provider || "gemini"
    
    # Resolve API key (from params if being set now, or stored)
    api_key = params[:api_key].presence
    if api_key.blank?
      api_key = case provider
                when "gemini" then current_user.gemini_key
                when "claude" then current_user.claude_key
                when "openai" then current_user.openai_key
                end
    end

    return render json: { success: false, error: "Lütfen önce geçerli bir API anahtarı girin", message: "Lütfen önce geçerli bir API anahtarı girin" }, status: :bad_request if api_key.blank?

    # Fetch live models from provider's official API
    result = Ai::FetchModelsService.call(provider, api_key)
    
    if result.success?
      # Save key and provider to user
      case provider
      when "gemini" then current_user.gemini_key = api_key
      when "claude" then current_user.claude_key = api_key
      when "openai" then current_user.openai_key = api_key
      end
      current_user.ai_provider = provider
      current_user.ai_model = params[:ai_model] if params[:ai_model].present?
      current_user.save(validate: false)

      render json: {
        success: true,
        message: "Bağlantı başarılı!",
        provider: current_user.ai_provider,
        model: current_user.ai_model || result.models.first&.dig(:id),
        models: result.models
      }
    else
      render json: { success: false, error: result.error, message: result.error }, status: :unprocessable_entity
    end
  rescue => e
    render json: { success: false, error: "Yapay zeka servisine bağlanırken hata oluştu: #{e.message}", message: "Yapay zeka servisine bağlanırken hata oluştu: #{e.message}" }, status: :unprocessable_entity
  end

  def upload_avatar
    file = params[:file] || params[:avatar] || params[:image]
    return render json: { error: "Lütfen bir resim dosyası seçin" }, status: :bad_request unless file

    result = Email::AvatarUploadService.call(current_user, file)
    if result.success?
      render json: { avatar_path: result.path, user: { avatar_path: result.path } }
    else
      render json: { error: result.error }, status: :unprocessable_entity
    end
  end

  private

  def settings_params
    params.permit(:approval_system_enabled, :spy_pixel_blocking, :default_signature, :bio, :ai_provider, :ai_model, :name)
  end

  def settings_json
    models = []
    if current_user.ai_configured?
      begin
        provider = current_user.ai_provider.presence || "gemini"
        key = current_user.active_ai_key
        res = Ai::FetchModelsService.call(provider, key)
        models = res.models if res.success?
      rescue => e
        Rails.logger.warn "Failed to auto-fetch models for settings: #{e.message}"
      end
    end

    {
      name: current_user.name,
      email: current_user.email,
      avatar_path: current_user.avatar_path,
      bio: current_user.bio,
      approval_system_enabled: current_user.approval_system_enabled,
      spy_pixel_blocking: current_user.spy_pixel_blocking,
      default_signature: current_user.default_signature,
      ai_provider: current_user.ai_provider,
      ai_model: current_user.ai_model,
      ai_configured: current_user.ai_configured?,
      available_models: models,
      has_gemini_key: current_user.gemini_key.present?,
      has_claude_key: current_user.claude_key.present?,
      has_openai_key: current_user.openai_key.present?
    }
  end
end

