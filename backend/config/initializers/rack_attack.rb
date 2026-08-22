# In development or testing, disable throttling so fast local polling works smoothly
Rack::Attack.enabled = Rails.env.production?

# User login — 10 attempts/minute per IP
Rack::Attack.throttle("login/ip", limit: 10, period: 60) do |req|
  req.ip if req.path == "/api/v1/auth/login" && req.post?
end

# User registration — 10 attempts/minute per IP
Rack::Attack.throttle("register/ip", limit: 10, period: 60) do |req|
  req.ip if req.path == "/api/v1/auth/register" && req.post?
end

# C7 Fix: Admin login brute force protection — 5 attempts/minute per IP
Rack::Attack.throttle("admin_login/ip", limit: 5, period: 60) do |req|
  req.ip if req.path == "/api/v1/admin/auth/login" && req.post?
end

# H1 Fix: Throttle check_email endpoint to prevent user enumeration
Rack::Attack.throttle("check_email/ip", limit: 15, period: 60) do |req|
  req.ip if req.path == "/api/v1/auth/check_email"
end

# Global API throttle
Rack::Attack.throttle("api/ip", limit: 3000, period: 60) do |req|
  req.ip if req.path.start_with?("/api/")
end

# Return 429 JSON for all throttled requests
Rack::Attack.throttled_responder = lambda do |_req|
  [429, { "Content-Type" => "application/json" }, ['{"error":"Çok fazla istek gönderildi. Lütfen biraz bekleyin.","retry_after":60}']]
end
