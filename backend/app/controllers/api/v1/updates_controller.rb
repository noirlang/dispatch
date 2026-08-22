class Api::V1::UpdatesController < Api::V1::Admin::BaseController
  def check
    info = System::UpdateService.check
    render json: info
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

