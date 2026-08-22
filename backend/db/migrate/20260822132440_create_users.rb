class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :name,            null: false
      t.string :email,           null: false
      t.string :password_digest, null: false
      t.string :avatar_path
      t.boolean :approval_system_enabled, default: true,  null: false
      t.boolean :spy_pixel_blocking,      default: true,  null: false
      t.text    :default_signature
      t.string  :ai_provider  # gemini | claude | openai
      # Encrypted API keys
      t.string  :encrypted_gemini_key
      t.string  :encrypted_gemini_key_iv
      t.string  :encrypted_claude_key
      t.string  :encrypted_claude_key_iv
      t.string  :encrypted_openai_key
      t.string  :encrypted_openai_key_iv

      t.timestamps
    end
    add_index :users, :email, unique: true
  end
end
