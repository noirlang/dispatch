Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      # Auth
      post   "auth/register",            to: "auth#register"
      post   "auth/login",               to: "auth#login"
      post   "auth/check_email",         to: "auth#check_email"
      get    "auth/registration_status", to: "auth#registration_status"
      post   "auth/verify_invite",       to: "auth#verify_invite"
      delete "auth/logout",              to: "auth#logout"
      get    "auth/me",                  to: "auth#me"

      # Setup Wizard & DNS
      get  "setup/status",          to: "setup#status"
      post "setup",                 to: "setup#create"
      post "setup/cloudflare_sync", to: "setup#cloudflare_sync"

      # Sender avatar
      get  "sender_profiles/avatar",        to: "sender_profiles#avatar"
      post "sender_profiles/update_avatar", to: "sender_profiles#update_avatar"

      # Emails
      resources :emails, only: [:index, :show, :create, :destroy] do
        member do
          post :reply
          post :forward
          post :approve
          post :reject
          post :block_sender
          post :toggle_flag
          post :toggle_important_sender
          post :ai_summary
          post :ai_reply
        end
        collection do
          post :merge_threads
          get  :contacts
        end
      end

      # Image proxy (spy pixel blocker)
      get "image_proxy", to: "image_proxy#show"

      # Sender rules & Contact groups
      resources :sender_rules, only: [:index, :create, :update, :destroy]
      resources :contact_groups

      # Speakeasy codes
      resources :speakeasy_codes, only: [:index, :create, :destroy]

      # AI dashboard
      resources :dashboard, only: [:index, :show, :create, :destroy] do
        member do
          post :add_to_calendar
        end
      end

      # Calendar
      namespace :calendar do
        resources :events
      end

      # RSS
      namespace :rss do
        resources :feeds, only: [:index, :create, :destroy] do
          member do
            post :refresh
          end
        end
        resources :items, only: [:index] do
          member do
            patch :read
          end
        end
      end

      # Settings
      get  "settings",               to: "settings#show"
      patch "settings",              to: "settings#update"
      post "settings/ai/test",       to: "settings#test_ai"
      post "settings/upload_avatar", to: "settings#upload_avatar"

      # Updates (noirlang/dispatch safe updater)
      get  "updates/check",          to: "updates#check"
      post "updates/apply",          to: "updates#apply"

      # Admin Management API
      namespace :admin do
        post "auth/login",             to: "auth#login"
        get  "auth/me",                to: "auth#me"
        get  "system/status",          to: "system#status"
        get  "system/settings",        to: "system#settings"
        post "system/settings",        to: "system#update_settings"
        get  "system/users",           to: "system#users"
        post "system/create_user",     to: "system#create_user"
        post "system/change_password", to: "system#change_password"
        get  "updates/check",          to: "updates#check"
        post "updates/apply",          to: "updates#apply"

        resources :invite_codes, only: [:index, :create, :destroy] do
          post :toggle, on: :member
        end
      end
    end
  end

  # Public blog (no auth)
  # blog.domain.com or /blog namespace
  constraints(subdomain: "blog") do
    namespace :blog, path: "" do
      get "/",              to: "posts#index"
      get "/@:handle",      to: "posts#index",  as: :author_posts
      get "/@:handle/:slug", to: "posts#show",  as: :author_post
    end
  end

  # Also accessible without subdomain for local dev
  namespace :blog do
    get "/",               to: "posts#index"
    get "/@:handle",       to: "posts#index"
    get "/@:handle/:slug", to: "posts#show"
  end
end
