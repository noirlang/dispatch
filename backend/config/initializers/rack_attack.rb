# In development or testing, disable throttling so fast local polling works smoothly
Rack::Attack.enabled = Rails.env.production?

Rack::Attack.throttle("login/ip", limit: 10, period: 60) do |req|
  req.ip if req.path == "/api/v1/auth/login" && req.post?
end

Rack::Attack.throttle("register/ip", limit: 10, period: 60) do |req|
  req.ip if req.path == "/api/v1/auth/register" && req.post?
end

Rack::Attack.throttle("api/ip", limit: 3000, period: 60) do |req|
  req.ip if req.path.start_with?("/api/")
end
