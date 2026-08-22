class CreateSenderProfiles < ActiveRecord::Migration[8.1]
  def change
    create_table :sender_profiles do |t|
      t.string :email,        null: false
      t.string :domain,       null: false
      t.string :display_name
      t.string :avatar_url    # URL to logo/avatar image
      t.boolean :is_known_company, default: false  # pre-populated entry
      t.timestamps
    end
    add_index :sender_profiles, :email,  unique: true
    add_index :sender_profiles, :domain
  end
end
