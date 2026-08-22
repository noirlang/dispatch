class AddAiModelToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :ai_model, :string
  end
end
