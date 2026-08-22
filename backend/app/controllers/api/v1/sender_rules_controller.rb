class Api::V1::SenderRulesController < Api::V1::BaseController
  def index
    rules = current_user.sender_rules.order(:status, :email_address)
    render json: rules
  end

  def create
    rule = current_user.sender_rules.find_or_initialize_by(email_address: params[:email_address])
    rule.assign_attributes(rule_params)
    rule.approved_at = Time.current if rule.status == "approved"
    if rule.save
      render json: rule, status: :created
    else
      render json: { errors: rule.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    rule = current_user.sender_rules.find(params[:id])
    rule.update!(rule_params)
    render json: rule
  end

  def destroy
    current_user.sender_rules.find(params[:id]).destroy
    render json: { message: "Removed" }
  end

  private

  def rule_params
    params.permit(:email_address, :domain, :status)
  end
end
