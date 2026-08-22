Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins_list = ENV.fetch("CORS_ORIGIN", "http://localhost:5173").split(",").map(&:strip).reject(&:blank?)
    origins(*origins_list)
    resource "*",
      headers: :any,
      methods: [:get, :post, :patch, :put, :delete, :options, :head],
      expose: ["Authorization"]
  end
end
