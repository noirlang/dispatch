class CreateServerConfigs < ActiveRecord::Migration[8.1]
  def change
    create_table :server_configs do |t|
      t.string  :domain,          null: false, default: "dispatch.local"
      t.string  :mail_subdomain, null: false, default: "mail"
      t.string  :ipv4,            default: "127.0.0.1"
      t.string  :ipv6
      t.boolean :enable_ipv6,     default: false, null: false
      t.string  :mode,            default: "local_development", null: false # local_development | production
      t.text    :dkim_selector,   default: "mail"
      t.text    :dkim_public_key
      t.text    :dkim_private_key
      t.boolean :is_configured,   default: false, null: false

      t.timestamps
    end
  end
end
