class CreateSpeakeasycodes < ActiveRecord::Migration[8.1]
  def change
    create_table :speakeasycodes do |t|
      t.references :user, null: false, foreign_key: true
      t.string :code
      t.string :label
      t.datetime :expires_at
      t.boolean :single_use
      t.boolean :used

      t.timestamps
    end
    add_index :speakeasycodes, :code, unique: true
  end
end
