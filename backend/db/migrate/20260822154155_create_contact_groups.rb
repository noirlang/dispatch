class CreateContactGroups < ActiveRecord::Migration[8.1]
  def change
    create_table :contact_groups do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.string :description
      t.jsonb :members, default: []
      t.string :color, default: "#3b82f6"
      t.timestamps
    end
    add_index :contact_groups, [:user_id, :name], unique: true
  end
end
