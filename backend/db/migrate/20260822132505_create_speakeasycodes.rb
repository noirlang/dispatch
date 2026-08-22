class CreateSpeakeasycodes < ActiveRecord::Migration[8.1]
  def change
    create_table :speakeasy_codes do |t|
      t.references :user, null: false, foreign_key: true
      t.string :code, null: false
      t.string :label
      t.datetime :expires_at
      t.boolean :single_use, default: false, null: false
      t.boolean :used, default: false, null: false

      t.timestamps
    end
    add_index :speakeasy_codes, :code, unique: true
  end
end
