class Api::V1::Rss::FeedsController < Api::V1::BaseController
  def index
    render json: current_user.rss_feeds.order(:title)
  end

  def create
    feed = current_user.rss_feeds.build(feed_params)
    if feed.save
      RssFetchWorker.perform_async(feed.id)
      render json: feed, status: :created
    else
      render json: { errors: feed.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    current_user.rss_feeds.find(params[:id]).destroy
    render json: { message: "Deleted" }
  end

  def refresh
    feed = current_user.rss_feeds.find(params[:id])
    RssFetchWorker.perform_async(feed.id)
    render json: { message: "Refresh queued" }
  end

  private

  def feed_params
    params.permit(:url, :category, :refresh_interval)
  end
end
