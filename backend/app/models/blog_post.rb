class BlogPost < ApplicationRecord
  validates :title,        presence: true
  validates :content,      presence: true
  validates :author_email, presence: true
  validates :slug,         presence: true, uniqueness: true

  before_validation :clean_author_email
  before_validation :set_slug, :set_author_handle, on: :create

  scope :published, -> { where("published_at <= ?", Time.current).order(published_at: :desc) }
  scope :by_handle, ->(handle) { where(author_handle: handle.downcase) }

  def self.find_author_post_to_delete(author_email_raw, query)
    clean_author = author_email_raw.to_s.gsub(/.*<([^>]+)>.*/, '\1').strip.downcase
    clean_query = query.to_s.gsub(/[\"\'\`]/, "").strip
    return nil if clean_author.blank? || clean_query.blank?

    author_posts = where("LOWER(author_email) = ?", clean_author)
    
    # 1. Exact match on title (case-insensitive)
    post = author_posts.where("LOWER(TRIM(title)) = ?", clean_query.downcase).first
    return post if post

    # 2. Exact match on slug
    post = author_posts.where("LOWER(TRIM(slug)) = ?", clean_query.parameterize).first
    return post if post

    # 3. Fuzzy partial match on title
    post = author_posts.where("title ILIKE ?", "%#{clean_query}%").first
    return post if post

    # 4. Fuzzy partial match on slug
    author_posts.where("slug ILIKE ?", "%#{clean_query.parameterize}%").first
  end

  private

  def clean_author_email
    self.author_email = author_email.to_s.gsub(/.*<([^>]+)>.*/, '\1').strip.downcase if author_email.present?
  end

  def set_author_handle
    self.author_handle = author_email.split("@").first.downcase.gsub(/[^a-z0-9_-]/, "-")
  end

  def set_slug
    base = title.downcase.gsub(/[^a-z0-9\s-]/, "").gsub(/\s+/, "-").first(80)
    self.slug = unique_slug(base)
  end

  def unique_slug(base)
    slug = base
    n = 2
    while BlogPost.exists?(slug: slug)
      slug = "#{base}-#{n}"
      n += 1
    end
    slug
  end
end
