class CreateRssItems < ActiveRecord::Migration[8.1]
  def change
    create_table :rss_items do |t|
      t.references :rss_feed, null: false, foreign_key: true
      t.string :guid
      t.string :title
      t.text :content
      t.string :url
      t.string :author
      t.datetime :published_at
      t.boolean :is_read
      t.boolean :starred

      t.timestamps
    end
  end
end
