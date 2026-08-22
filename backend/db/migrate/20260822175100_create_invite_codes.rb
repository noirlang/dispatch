class CreateInviteCodes < ActiveRecord::Migration[8.1]
  def change
    create_table :invite_codes do |t|
      t.string :code, null: false
      t.string :label
      t.integer :max_uses, default: 1
      t.integer :used_count, default: 0
      t.datetime :expires_at
      t.boolean :is_active, default: true
      t.timestamps
    end
    add_index :invite_codes, :code, unique: true
  end
end
