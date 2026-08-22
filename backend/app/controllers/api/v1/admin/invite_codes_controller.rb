class Api::V1::Admin::InviteCodesController < Api::V1::Admin::BaseController
  def index
    codes = InviteCode.order(created_at: :desc).map do |c|
      {
        id: c.id,
        code: c.code,
        label: c.label,
        max_uses: c.max_uses,
        used_count: c.used_count,
        expires_at: c.expires_at,
        is_active: c.is_active,
        created_at: c.created_at
      }
    end
    render json: codes
  end

  def create
    code = InviteCode.new(invite_params)
    if code.save
      render json: code, status: :created
    else
      render json: { error: code.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end

  def destroy
    code = InviteCode.find(params[:id])
    code.destroy
    render json: { message: "Davet kodu silindi." }
  end

  def toggle
    code = InviteCode.find(params[:id])
    code.update(is_active: !code.is_active)
    render json: { message: "Durum güncellendi.", is_active: code.is_active }
  end

  private

  def invite_params
    params.permit(:code, :label, :max_uses, :expires_at, :is_active)
  end
end
