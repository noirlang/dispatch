Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    if Rails.env.development?
      origins "*"
    else
      origins_list = ENV.fetch("CORS_ORIGIN", "http://localhost:5173").split(",").map(&:strip).reject(&:blank?)
      origins(*origins_list)
    end
    resource "*",
      headers: :any,
      methods: [:get, :post, :patch, :put, :delete, :options, :head],
      expose: ["Authorization"]
  end
end

