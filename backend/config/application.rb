require_relative "boot"
require "rails/all"

Bundler.require(*Rails.groups)

module Backend
  class Application < Rails::Application
    config.load_defaults 8.1
    config.api_only = true
    config.autoload_paths << Rails.root.join("lib")
    config.time_zone = "UTC"
    config.beginning_of_week = :monday
  end
end
# (appended)
