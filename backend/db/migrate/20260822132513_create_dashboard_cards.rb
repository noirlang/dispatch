class CreateDashboardCards < ActiveRecord::Migration[8.1]
  def change
    create_table :dashboard_cards do |t|
      t.references :user,  null: false, foreign_key: true
      t.references :email, null: true,  foreign_key: true
      t.string  :card_type, null: false, default: "general"
      t.text    :summary
      t.string  :priority,  default: "low"
      t.string  :language
      t.datetime :expires_at
      t.boolean  :dismissed, default: false, null: false
      t.jsonb    :actionable_items,   default: []
      t.jsonb    :calendar_suggestion
      t.jsonb    :tags,               default: []

      t.timestamps
    end
    add_index :dashboard_cards, [:user_id, :dismissed]
  end
end
