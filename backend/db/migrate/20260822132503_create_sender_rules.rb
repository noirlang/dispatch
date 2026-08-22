class CreateSenderRules < ActiveRecord::Migration[8.1]
  def change
    create_table :sender_rules do |t|
      t.references :user, null: false, foreign_key: true
      t.string :email_address
      t.string :domain
      t.string :status
      t.datetime :approved_at

      t.timestamps
    end
  end
end
