class AddIsFlaggedToEmails < ActiveRecord::Migration[8.1]
  def change
    add_column :emails, :is_flagged, :boolean
  end
end
