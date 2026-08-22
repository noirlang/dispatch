class CreateRssFeeds < ActiveRecord::Migration[8.1]
  def change
    create_table :rss_feeds do |t|
      t.references :user, null: false, foreign_key: true
      t.string :url
      t.string :title
      t.text :description
      t.string :favicon_url
      t.string :category
      t.integer :refresh_interval
      t.datetime :last_fetched_at

      t.timestamps
    end
  end
end
