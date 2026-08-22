class Api::V1::SettingsController < Api::V1::BaseController
  def show
    render json: settings_json
  end

  def update
    current_user.update!(settings_params)
    # Update encrypted API keys separately if provided
    current_user.gemini_key = params[:gemini_key] if params[:gemini_key].present?
    current_user.claude_key = params[:claude_key] if params[:claude_key].present?
    current_user.openai_key = params[:openai_key] if params[:openai_key].present?
    current_user.save!
    render json: settings_json
  end

  def test_ai
    provider = params[:provider].presence || current_user.ai_provider
    current_user.ai_provider = provider if provider.present?
    current_user.ai_model = params[:ai_model] if params[:ai_model].present?

    return render json: { error: "No AI provider configured" }, status: :bad_request unless current_user.ai_configured?

    result = Ai::TestService.call(current_user)
    if result.success?
      render json: { message: "Connection successful", provider: current_user.ai_provider, model: current_user.ai_model }
    else
      render json: { error: result.error }, status: :unprocessable_entity
    end
  end

  def upload_avatar
    file = params[:file]
    return render json: { error: "No file" }, status: :bad_request unless file

    result = Email::AvatarUploadService.call(current_user, file)
    if result.success?
      render json: { avatar_path: result.path }
    else
      render json: { error: result.error }, status: :unprocessable_entity
    end
  end

  private

  def settings_params
    params.permit(:approval_system_enabled, :spy_pixel_blocking, :default_signature, :ai_provider, :ai_model, :name)
  end

  def settings_json
    provider = current_user.ai_provider || "gemini"
    {
      name: current_user.name,
      email: current_user.email,
      avatar_path: current_user.avatar_path,
      approval_system_enabled: current_user.approval_system_enabled,
      spy_pixel_blocking: current_user.spy_pixel_blocking,
      default_signature: current_user.default_signature,
      ai_provider: current_user.ai_provider,
      ai_model: current_user.ai_model,
      available_models: Ai::AnalyzeService.models_for(provider),
      all_models: {
        gemini: Ai::AnalyzeService.models_for("gemini"),
        claude: Ai::AnalyzeService.models_for("claude"),
        openai: Ai::AnalyzeService.models_for("openai")
      },
      ai_configured: current_user.ai_configured?,
      has_gemini_key: current_user.gemini_key.present?,
      has_claude_key: current_user.claude_key.present?,
      has_openai_key: current_user.openai_key.present?
    }
  end
end
