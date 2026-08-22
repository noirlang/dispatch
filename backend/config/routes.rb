Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      # Auth
      post   "auth/register",  to: "auth#register"
      post   "auth/login",     to: "auth#login"
      delete "auth/logout",    to: "auth#logout"
      get    "auth/me",        to: "auth#me"

      # Emails
      resources :emails, only: [:index, :show, :create, :destroy] do
        member do
          post :reply
          post :forward
          post :approve
          post :reject
        end
        collection do
          post :merge_threads
        end
      end

      # Image proxy (spy pixel blocker)
      get "image_proxy", to: "image_proxy#show"

      # Sender rules (approved/blocked/important contacts)
      resources :sender_rules, only: [:index, :create, :update, :destroy]

      # Speakeasy codes
      resources :speakeasy_codes, only: [:index, :create, :destroy]

      # AI dashboard
      resources :dashboard, only: [:index, :show, :destroy] do
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
      get  "settings",              to: "settings#show"
      patch "settings",             to: "settings#update"
      post "settings/ai/test",      to: "settings#test_ai"
      post "settings/upload_avatar", to: "settings#upload_avatar"
    end
  end
end
