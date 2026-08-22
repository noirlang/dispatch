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

  private

  def post_summary(post)
    {
      slug:          post.slug,
      title:         post.title,
      excerpt:       post.content.first(200).strip,
      author_handle: post.author_handle,
      author_name:   post.author_name,
      author_avatar: post.author_avatar,
      published_at:  post.published_at,
      url:           "/@#{post.author_handle}/#{post.slug}"
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
