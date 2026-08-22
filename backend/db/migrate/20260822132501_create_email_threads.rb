class CreateEmailThreads < ActiveRecord::Migration[8.1]
  def change
    create_table :email_threads do |t|
      t.references :user, null: false, foreign_key: true
      t.string :subject
      t.integer :merged_into_id

      t.timestamps
    end
  end
end
