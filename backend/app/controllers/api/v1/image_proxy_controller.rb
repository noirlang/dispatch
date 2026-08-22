class Api::V1::ImageProxyController < ActionController::API
  def show
    url = params[:url]
    return head :bad_request if url.blank?

    result = Email::ImageProxyService.fetch(url)
    send_data result[:data], type: result[:content_type], disposition: "inline"
  end
end
