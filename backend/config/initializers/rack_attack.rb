Rack::Attack.throttle("login/ip", limit: 5, period: 60) do |req|
  req.ip if req.path == "/api/v1/auth/login" && req.post?
end

Rack::Attack.throttle("register/ip", limit: 3, period: 60) do |req|
  req.ip if req.path == "/api/v1/auth/register" && req.post?
end

Rack::Attack.throttle("api/ip", limit: 100, period: 60) do |req|
  req.ip if req.path.start_with?("/api/")
end
