# Seed data for Dispatch testing
puts "Seeding Dispatch database..."

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

# Sender Rules
user.sender_rules.find_or_create_by!(email_address: "notifications@github.com") do |r|
  r.status = "approved"
  r.approved_at = 2.days.ago
end

user.sender_rules.find_or_create_by!(email_address: "billing@stripe.com") do |r|
  r.status = "important"
  r.approved_at = 1.day.ago
end

user.sender_rules.find_or_create_by!(email_address: "spam@marketing-promo.xyz") do |r|
  r.status = "blocked"
end

# Speakeasy Code
user.speakeasy_codes.find_or_create_by!(code: "DISPATCH-VIP2026-X7") do |s|
  s.label = "Freelance Client VIP Pass"
  s.expires_at = 30.days.from_now
  s.single_use = false
  s.used = false
end

# Email Threads & Emails
# 1. Travel Email (Turkish Airlines / Flight) -> Inbox
t1 = user.email_threads.create!(subject: "Uçuş Rezervasyonunuz: TK102 İstanbul - Ankara")
e1 = user.emails.create!(
  thread: t1,
  from_address: "bilgi@turkishairlines.com",
  to_address: "melih@dispatch.local",
  subject: "Uçuş Rezervasyonunuz: TK102 İstanbul - Ankara",
  body_text: "Sayın Melih Emik,\n\n24 Ağustos 2026 tarihindeki TK102 sefer sayılı İstanbul (IST) - Ankara (ESB) uçuşunuz onaylanmıştır.\n\nKalkış Saati: 14:30\nPNR Rezervasyon Kodu: XYZ892\nKoltuk: 12A\nKapı Kapanış: 14:05\n\nİyi uçuşlar dileriz.",
  folder: "inbox",
  is_read: false,
  message_id: "flight-tk102-#{SecureRandom.hex(4)}@thy.com"
)

# 2. Cargo Tracking -> Inbox
t2 = user.email_threads.create!(subject: "DHL Express: Kargonuz Dağıtımda (Takip No: 1234567890)")
e2 = user.emails.create!(
  thread: t2,
  from_address: "track@dhl.com",
  to_address: "melih@dispatch.local",
  subject: "DHL Express: Kargonuz Dağıtımda (Takip No: 1234567890)",
  body_text: "Merhaba,\n\n1234567890 takip numaralı gönderiniz kuryemiz tarafından dağıtıma çıkarılmıştır.\nTahmini Teslimat: Bugün 16:30'a kadar.\nTeslimat Adresi: Kadıköy / İstanbul\n\nTeslimatı canlı takip etmek için aşağıdaki linki kullanabilirsiniz:\nhttps://www.dhl.com/tr/track?id=1234567890",
  folder: "inbox",
  is_read: false,
  message_id: "dhl-track-#{SecureRandom.hex(4)}@dhl.com"
)

# 3. OTP Code -> Inbox
t3 = user.email_threads.create!(subject: "Doğrulama Kodunuz: 482193")
e3 = user.emails.create!(
  thread: t3,
  from_address: "security@apple.com",
  to_address: "melih@dispatch.local",
  subject: "Doğrulama Kodunuz: 482193",
  body_text: "Giriş yapmak için tek kullanımlık doğrulama kodunuz:\n\n482193\n\nBu kod 10 dakika boyunca geçerlidir. Güvenliğiniz için bu kodu kimseyle paylaşmayınız.",
  folder: "inbox",
  is_read: false,
  message_id: "apple-otp-#{SecureRandom.hex(4)}@apple.com"
)

# 4. Unknown Sender -> Approvals Queue
t4 = user.email_threads.create!(subject: "İş Birliği Teklifi - Dispatch Projesi")
e4 = user.emails.create!(
  thread: t4,
  from_address: "ahmet@yenigirisim.co",
  to_address: "melih@dispatch.local",
  subject: "İş Birliği Teklifi - Dispatch Projesi",
  body_text: "Merhaba Melih Bey,\n\nDispatch projenizi çok beğendik. Yeni nesil e-posta altyapımızla entegre olma konusunda kısa bir online toplantı yapabilir miyiz?\n\nİyi çalışmalar,\nAhmet Yılmaz",
  folder: "approvals",
  is_read: false,
  message_id: "collab-#{SecureRandom.hex(4)}@yenigirisim.co"
)

# Dashboard Notice Cards (Pano)
user.dashboard_cards.create!(
  email: e1,
  card_type: "travel",
  summary: "İstanbul (IST) → Ankara (ESB) THY TK102 Uçuşu. Kalkış: 14:30.",
  priority: "high",
  language: "tr",
  actionable_items: [
    { label: "Rezervasyon (PNR)", value: "XYZ892", copyable: true },
    { label: "Koltuk", value: "12A", copyable: true }
  ],
  calendar_suggestion: {
    title: "✈️ İstanbul - Ankara Uçuşu (TK102)",
    date: "2026-08-24",
    time: "14:30",
    all_day: false,
    description: "THY TK102 - PNR: XYZ892, Koltuk: 12A"
  },
  tags: ["uçuş", "seyahat", "thy"]
)

user.dashboard_cards.create!(
  email: e2,
  card_type: "tracking",
  summary: "DHL Express kargonuz dağıtımda. Tahmini teslim: 16:30.",
  priority: "medium",
  language: "tr",
  actionable_items: [
    { label: "Takip No", value: "1234567890", copyable: true, url: "https://www.dhl.com/tr/track?id=1234567890" }
  ],
  tags: ["kargo", "dhl", "teslimat"]
)

user.dashboard_cards.create!(
  email: e3,
  card_type: "otp",
  summary: "Apple Kimliği Tek Kullanımlık Doğrulama Kodu",
  priority: "high",
  expires_at: 10.minutes.from_now,
  language: "tr",
  actionable_items: [
    { label: "Doğrulama Kodu", value: "482193", copyable: true }
  ],
  tags: ["otp", "güvenlik"]
)

# Calendar Events
user.calendar_events.create!(
  title: "✈️ İstanbul - Ankara Uçuşu (TK102)",
  description: "THY TK102 - PNR: XYZ892",
  location: "İstanbul Havalimanı (IST)",
  starts_at: Time.current.beginning_of_week + 2.days + 14.hours + 30.minutes,
  ends_at: Time.current.beginning_of_week + 2.days + 15.hours + 45.minutes,
  all_day: false,
  source: "ai_extracted",
  color: "#ffaa00"
)

user.calendar_events.create!(
  title: "📅 Dispatch Sprint Planlama",
  description: "Haftalık mimari ve ürün değerlendirmesi",
  location: "Online (Google Meet)",
  starts_at: Time.current.beginning_of_week + 1.day + 10.hours,
  ends_at: Time.current.beginning_of_week + 1.day + 11.hours,
  all_day: false,
  source: "manual",
  color: "#44ff88"
)

# RSS Feeds
rss = user.rss_feeds.create!(
  url: "https://news.ycombinator.com/rss",
  title: "Hacker News",
  category: "Tech",
  refresh_interval: 15,
  last_fetched_at: Time.current
)

rss.rss_items.create!(
  guid: "hn-item-1",
  title: "Show HN: Dispatch – Self-hosted modern email client",
  url: "https://news.ycombinator.com",
  author: "dispatch_team",
  published_at: 2.hours.ago,
  is_read: false
)

rss.rss_items.create!(
  guid: "hn-item-2",
  title: "Postfix and Dovecot Architecture in Modern Webmail Clients",
  url: "https://news.ycombinator.com",
  author: "dev_sec",
  published_at: 5.hours.ago,
  is_read: true
)

# Sample Blog Post (via blog@dispatch.local)
BlogPost.create!(
  title: "Welcome to Dispatch – The Intelligent Webmail",
  content: "Dispatch is built from the ground up to reimagine personal and team email communication. Combining EmailWiz with AI parsing, vertical calendar, and RSS feeds.",
  author_email: "melih@dispatch.local",
  author_name: "Melih Emik",
  published_at: 1.day.ago
)

puts "✅ Seed data created successfully!"
