class Api::V1::Rss::ItemsController < Api::V1::BaseController
  def index
    feed_ids = current_user.rss_feeds.pluck(:id)
    items = RssItem.where(rss_feed_id: feed_ids).recent
    items = items.unread if params[:unread] == "true"
    items = items.where(rss_feed_id: params[:feed_id]) if params[:feed_id]
    render json: items.limit(50)
  end

  def read
    item = RssItem.joins(:rss_feed).where(rss_feeds: { user_id: current_user.id }).find(params[:id])
    item.update!(is_read: true)
    render json: item
  end
end
