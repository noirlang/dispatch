# Dispatch Clean Database Initializer
puts "Initializing Dispatch database..."

# Server Config
ServerConfig.first_or_create!(
  domain: "dispatch.local",
  mail_subdomain: "mail",
  ipv4: "127.0.0.1",
  enable_ipv6: false,
  mode: "local_development",
  is_configured: true
)

# User 1: Melih
user = User.find_or_create_by!(email: "melih@dispatch.local") do |u|
  u.name = "Melih Emik"
  u.password = "Test1234!"
  u.password_confirmation = "Test1234!"
  u.approval_system_enabled = true
  u.spy_pixel_blocking = true
  u.default_signature = "Best regards,\nMelih Emik | Dispatch"
  u.ai_provider = "gemini"
end

puts "✅ Database initialized with clean user: #{user.email}"
