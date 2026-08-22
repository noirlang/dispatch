class Api::V1::Rss::ItemsController < Api::V1::BaseController
  def index
    feed_ids = current_user.rss_feeds.pluck(:id)
    items = RssItem.where(rss_feed_id: feed_ids).includes(:rss_feed).recent
    items = items.unread if params[:unread] == "true"
    items = items.where(rss_feed_id: params[:feed_id]) if params[:feed_id].present?
    
    render json: items.limit(100).map { |item|
      {
        id: item.id,
        title: item.title,
        content: item.content,
        url: item.url,
        author: item.author,
        published_at: item.published_at,
        is_read: item.is_read,
        starred: item.starred,
        rss_feed_id: item.rss_feed_id,
        feed_title: item.rss_feed&.title
      }
    }
  end

  def read
    item = RssItem.joins(:rss_feed).where(rss_feeds: { user_id: current_user.id }).find(params[:id])
    item.update!(is_read: true)
    render json: item
  end
end
