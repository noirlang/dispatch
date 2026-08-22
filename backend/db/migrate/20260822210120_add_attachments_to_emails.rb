class AddAttachmentsToEmails < ActiveRecord::Migration[8.1]
  def change
    add_column :emails, :attachments, :jsonb, default: []
  end
end
