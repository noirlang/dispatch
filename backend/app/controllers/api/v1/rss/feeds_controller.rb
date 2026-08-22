class Api::V1::Rss::FeedsController < Api::V1::BaseController
  def index
    feeds = current_user.rss_feeds.includes(:rss_items).order(:title)
    render json: feeds.map { |f|
      {
        id: f.id,
        url: f.url,
        title: f.title.presence || f.url,
        description: f.description,
        category: f.category,
        refresh_interval: f.refresh_interval,
        last_fetched_at: f.last_fetched_at,
        item_count: f.rss_items.count,
        unread_count: f.rss_items.where(is_read: false).count
      }
    }
  end

  def create
    feed = current_user.rss_feeds.build(feed_params)
    if feed.save
      # Immediately fetch articles so items appear without delay
      begin
        RssFetchWorker.new.perform(feed.id)
      rescue => e
        Rails.logger.warn "Immediate RSS fetch error: #{e.message}"
      end

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
    begin
      RssFetchWorker.new.perform(feed.id)
    rescue => e
      Rails.logger.warn "Manual RSS refresh error: #{e.message}"
    end
    render json: { message: "Refreshed", items_count: feed.rss_items.count }
  end

  private

  def feed_params
    params.permit(:url, :category, :refresh_interval)
  end
end
