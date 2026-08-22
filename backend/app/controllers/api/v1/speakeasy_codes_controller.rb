class Api::V1::SpeakeasyCodesController < Api::V1::BaseController
  def index
    render json: current_user.speakeasy_codes.active.order(created_at: :desc)
  end

  def create
    code = current_user.speakeasy_codes.build(code_params)
    if code.save
      render json: code, status: :created
    else
      render json: { errors: code.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    current_user.speakeasy_codes.find(params[:id]).destroy
    render json: { message: "Code revoked" }
  end

  private

  def code_params
    params.permit(:label, :expires_at, :single_use)
  end
end
