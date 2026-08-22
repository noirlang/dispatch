class CreateEmails < ActiveRecord::Migration[8.1]
  def change
    create_table :emails do |t|
      t.references :user, null: false, foreign_key: true
      t.references :thread, foreign_key: { to_table: :email_threads }, null: true
      t.string :from_address, null: false
      t.string :to_address, null: false
      t.string :cc
      t.string :subject
      t.text :body_text
      t.text :body_html
      t.string :message_id
      t.string :status, default: "approved"
      t.string :folder, default: "inbox", null: false
      t.boolean :is_read, default: false, null: false

      t.timestamps
    end
    add_index :emails, :message_id
    add_index :emails, [:user_id, :folder]
  end
end
