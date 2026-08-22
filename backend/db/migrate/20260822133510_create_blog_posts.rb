class CreateBlogPosts < ActiveRecord::Migration[8.1]
  def change
    create_table :blog_posts do |t|
      t.string   :title,        null: false
      t.string   :slug,         null: false
      t.text     :content,      null: false
      t.string   :author_email, null: false   # melih@domain.com
      t.string   :author_name                 # Melih Emik
      t.string   :author_handle               # melih (from email prefix)
      t.string   :author_avatar               # avatar URL
      t.datetime :published_at, null: false
      t.timestamps
    end
    add_index :blog_posts, :slug,         unique: true
    add_index :blog_posts, :author_handle
    add_index :blog_posts, :published_at
  end
end
