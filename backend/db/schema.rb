# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_08_22_210120) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "blog_posts", force: :cascade do |t|
    t.string "author_avatar"
    t.string "author_email", null: false
    t.string "author_handle"
    t.string "author_name"
    t.text "content", null: false
    t.datetime "created_at", null: false
    t.datetime "published_at", null: false
    t.string "slug", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["author_handle"], name: "index_blog_posts_on_author_handle"
    t.index ["published_at"], name: "index_blog_posts_on_published_at"
    t.index ["slug"], name: "index_blog_posts_on_slug", unique: true
  end

  create_table "calendar_events", force: :cascade do |t|
    t.boolean "all_day"
    t.string "color"
    t.datetime "created_at", null: false
    t.text "description"
    t.integer "email_id"
    t.datetime "ends_at"
    t.string "location"
    t.string "source"
    t.datetime "starts_at"
    t.string "title"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_calendar_events_on_user_id"
  end

  create_table "contact_groups", force: :cascade do |t|
    t.string "color", default: "#3b82f6"
    t.datetime "created_at", null: false
    t.string "description"
    t.jsonb "members", default: []
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "name"], name: "index_contact_groups_on_user_id_and_name", unique: true
    t.index ["user_id"], name: "index_contact_groups_on_user_id"
  end

  create_table "dashboard_cards", force: :cascade do |t|
    t.jsonb "actionable_items", default: []
    t.jsonb "calendar_suggestion"
    t.string "card_type", default: "general", null: false
    t.datetime "created_at", null: false
    t.boolean "dismissed", default: false, null: false
    t.bigint "email_id"
    t.datetime "expires_at"
    t.string "language"
    t.string "priority", default: "low"
    t.text "summary"
    t.jsonb "tags", default: []
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["email_id"], name: "index_dashboard_cards_on_email_id"
    t.index ["user_id", "dismissed"], name: "index_dashboard_cards_on_user_id_and_dismissed"
    t.index ["user_id"], name: "index_dashboard_cards_on_user_id"
  end

  create_table "email_threads", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "merged_into_id"
    t.string "subject"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_email_threads_on_user_id"
  end

  create_table "emails", force: :cascade do |t|
    t.jsonb "attachments", default: []
    t.text "body_html"
    t.text "body_text"
    t.string "cc"
    t.datetime "created_at", null: false
    t.string "folder", default: "inbox", null: false
    t.string "from_address", null: false
    t.boolean "is_flagged"
    t.boolean "is_read", default: false, null: false
    t.string "message_id"
    t.string "status", default: "approved"
    t.string "subject"
    t.bigint "thread_id"
    t.string "to_address", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["message_id"], name: "index_emails_on_message_id"
    t.index ["thread_id"], name: "index_emails_on_thread_id"
    t.index ["user_id", "folder"], name: "index_emails_on_user_id_and_folder"
    t.index ["user_id"], name: "index_emails_on_user_id"
  end

  create_table "invite_codes", force: :cascade do |t|
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at"
    t.boolean "is_active", default: true
    t.string "label"
    t.integer "max_uses", default: 1
    t.datetime "updated_at", null: false
    t.integer "used_count", default: 0
    t.index ["code"], name: "index_invite_codes_on_code", unique: true
  end

  create_table "rss_feeds", force: :cascade do |t|
    t.string "category"
    t.datetime "created_at", null: false
    t.text "description"
    t.string "favicon_url"
    t.datetime "last_fetched_at"
    t.integer "refresh_interval"
    t.string "title"
    t.datetime "updated_at", null: false
    t.string "url"
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_rss_feeds_on_user_id"
  end

  create_table "rss_items", force: :cascade do |t|
    t.string "author"
    t.text "content"
    t.datetime "created_at", null: false
    t.string "guid"
    t.boolean "is_read"
    t.datetime "published_at"
    t.bigint "rss_feed_id", null: false
    t.boolean "starred"
    t.string "title"
    t.datetime "updated_at", null: false
    t.string "url"
    t.index ["rss_feed_id"], name: "index_rss_items_on_rss_feed_id"
  end

  create_table "sender_profiles", force: :cascade do |t|
    t.string "avatar_url"
    t.datetime "created_at", null: false
    t.string "display_name"
    t.string "domain", null: false
    t.string "email", null: false
    t.boolean "is_known_company", default: false
    t.datetime "updated_at", null: false
    t.index ["domain"], name: "index_sender_profiles_on_domain"
    t.index ["email"], name: "index_sender_profiles_on_email", unique: true
  end

  create_table "sender_rules", force: :cascade do |t|
    t.datetime "approved_at"
    t.datetime "created_at", null: false
    t.string "domain"
    t.string "email_address"
    t.string "status"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_sender_rules_on_user_id"
  end

  create_table "server_configs", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "dkim_private_key"
    t.text "dkim_public_key"
    t.text "dkim_selector", default: "mail"
    t.string "domain", default: "dispatch.local", null: false
    t.boolean "enable_ipv6", default: false, null: false
    t.string "ipv4", default: "127.0.0.1"
    t.string "ipv6"
    t.boolean "is_configured", default: false, null: false
    t.string "mail_subdomain", default: "mail", null: false
    t.string "mode", default: "local_development", null: false
    t.datetime "updated_at", null: false
  end

  create_table "speakeasy_codes", force: :cascade do |t|
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at"
    t.string "label"
    t.boolean "single_use", default: false, null: false
    t.datetime "updated_at", null: false
    t.boolean "used", default: false, null: false
    t.bigint "user_id", null: false
    t.index ["code"], name: "index_speakeasy_codes_on_code", unique: true
    t.index ["user_id"], name: "index_speakeasy_codes_on_user_id"
  end

  create_table "system_configs", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "key", null: false
    t.datetime "updated_at", null: false
    t.text "value"
    t.index ["key"], name: "index_system_configs_on_key", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.string "ai_model"
    t.string "ai_provider"
    t.boolean "approval_system_enabled", default: true, null: false
    t.string "avatar_path"
    t.text "bio"
    t.datetime "created_at", null: false
    t.text "default_signature"
    t.string "email", null: false
    t.string "encrypted_claude_key"
    t.string "encrypted_claude_key_iv"
    t.string "encrypted_gemini_key"
    t.string "encrypted_gemini_key_iv"
    t.string "encrypted_openai_key"
    t.string "encrypted_openai_key_iv"
    t.string "name", null: false
    t.string "password_digest", null: false
    t.boolean "spy_pixel_blocking", default: true, null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "calendar_events", "users"
  add_foreign_key "contact_groups", "users"
  add_foreign_key "dashboard_cards", "emails"
  add_foreign_key "dashboard_cards", "users"
  add_foreign_key "email_threads", "users"
  add_foreign_key "emails", "email_threads", column: "thread_id"
  add_foreign_key "emails", "users"
  add_foreign_key "rss_feeds", "users"
  add_foreign_key "rss_items", "rss_feeds"
  add_foreign_key "sender_rules", "users"
  add_foreign_key "speakeasy_codes", "users"
end
