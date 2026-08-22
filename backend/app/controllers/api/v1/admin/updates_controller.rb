class Api::V1::Admin::UpdatesController < Api::V1::Admin::BaseController
  def check
    render json: System::UpdateService.check
  end

  def apply
    res = System::UpdateService.apply
    if res[:success]
      render json: res
    else
      render json: res, status: :unprocessable_entity
    end
  end
end
