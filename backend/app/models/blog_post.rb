class BlogPost < ApplicationRecord
  validates :title,        presence: true
  validates :content,      presence: true
  validates :author_email, presence: true
  validates :slug,         presence: true, uniqueness: true

  before_validation :set_slug, :set_author_handle, on: :create

  scope :published, -> { where("published_at <= ?", Time.current).order(published_at: :desc) }
  scope :by_handle, ->(handle) { where(author_handle: handle.downcase) }

  private

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
