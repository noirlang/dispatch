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
