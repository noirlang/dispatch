require "builder"

class Blog::PostsController < ActionController::API
  # GET /blog/posts             - all posts
  # GET /blog/posts/@handle     - posts by author
  # GET /blog/posts/@handle/:slug - single post
  def index
    handle = params[:handle].to_s.delete_prefix("@").downcase.strip
    if handle.blank?
      return render json: { error: "Lütfen bir yazar profili belirtin (örn: /blog/@kullanici_adi)" }, status: :bad_request
    end

    posts = BlogPost.published.by_handle(handle)
    render json: posts.map { |p| post_summary(p) }
  end

  def show
    handle = params[:handle].to_s.delete_prefix("@").downcase.strip
    post = BlogPost.find_by!(slug: params[:slug], author_handle: handle)
    render json: post_full(post)
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Post not found" }, status: :not_found
  end

  # GET /blog/feed.xml or /blog/@handle/feed.xml
  def feed
    handle = params[:handle].to_s.delete_prefix("@").downcase.strip
    user = User.find_by("lower(email) LIKE ?", "#{handle}@%") if handle.present?
    
    posts = if handle.present?
              BlogPost.published.by_handle(handle).limit(50)
            else
              BlogPost.published.limit(50)
            end

    server_domain = ServerConfig.first&.domain.presence ||
                    SystemConfig.find_by(key: "server_domain")&.value.presence ||
                    "dispatch.local"

    feed_title = if user
                   "#{user.name} (@#{handle}) — Dispatch Blog"
                 elsif handle.present?
                   "@#{handle} — Dispatch Blog"
                 else
                   "Dispatch Blog"
                 end

    feed_desc = user&.bio.presence || "Blog posts published by @#{handle.presence || 'dispatch'}"
    site_url = handle.present? ? "http://#{server_domain}/blog/#{handle}" : "http://#{server_domain}/blog"

    xml = Builder::XmlMarkup.new(indent: 2)
    xml.instruct! :xml, version: "1.0", encoding: "UTF-8"
    xml.rss version: "2.0", "xmlns:atom" => "http://www.w3.org/2005/Atom" do
      xml.channel do
        xml.title feed_title
        xml.link site_url
        xml.description feed_desc
        xml.language "tr"
        xml.lastBuildDate(posts.first&.published_at&.rfc822 || Time.current.rfc822)
        xml.tag! "atom:link", href: "#{site_url}/feed.xml", rel: "self", type: "application/rss+xml"

        posts.each do |post|
          post_url = "http://#{server_domain}/blog/#{post.author_handle}/#{post.slug}"
          xml.item do
            xml.title post.title
            xml.link post_url
            xml.guid post_url, isPermaLink: "true"
            xml.pubDate post.published_at.rfc822
            xml.author "#{post.author_email} (#{post.author_name})"
            xml.description do
              xml.cdata! post.content.to_s
            end
          end
        end
      end
    end

    render body: xml.target!, content_type: "application/rss+xml; charset=utf-8"
  end

  private

  def post_summary(post)
    user = User.find_by("lower(email) = ?", post.author_email.to_s.downcase.strip)
    {
      slug:          post.slug,
      title:         post.title,
      excerpt:       post.content.first(200).strip,
      author_handle: post.author_handle,
      author_name:   post.author_name,
      author_avatar: user&.avatar_path || post.author_avatar,
      author_bio:    user&.bio.presence,
      published_at:  post.published_at,
      url:           "/blog/#{post.author_handle}/#{post.slug}"
    }
  end

  def post_full(post)
    {
      **post_summary(post),
      content:       post.content,
      author_email:  post.author_email
    }
  end
end
