class CreateEmails < ActiveRecord::Migration[8.1]
  def change
    create_table :emails do |t|
      t.references :user, null: false, foreign_key: true
      t.references :thread, null: false, foreign_key: true
      t.string :from_address
      t.string :to_address
      t.string :cc
      t.string :subject
      t.text :body_text
      t.text :body_html
      t.string :message_id
      t.string :status
      t.string :folder
      t.boolean :is_read

      t.timestamps
    end
    add_index :emails, :message_id, unique: true
  end
end
