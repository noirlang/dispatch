class CreateCalendarEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :calendar_events do |t|
      t.references :user, null: false, foreign_key: true
      t.string :title
      t.text :description
      t.string :location
      t.datetime :starts_at
      t.datetime :ends_at
      t.boolean :all_day
      t.string :source
      t.integer :email_id
      t.string :color

      t.timestamps
    end
  end
end
