# AGENTS.md — Dispatch Project Blueprint

> Bu dosya, **Dispatch** projesinin tüm mimari kararlarını, özelliklerini, geliştirme kurallarını ve agent talimatlarını içerir. Projeye katkıda bulunan her agent ve geliştirici bu dosyayı referans almalıdır.

---

## 📌 Proje Genel Bakış

**Dispatch**, EmailWiz (Postfix + Dovecot) altyapısı üzerine inşa edilmiş, modern ve akıllı bir e-posta istemcisidir. Klasik e-posta özelliklerinin ötesinde; yapay zeka entegrasyonu, RSS akışları, akıllı takvim ve güvenlik odaklı özelliklerle donatılmıştır.

| Özellik | Değer |
|---|---|
| **Proje Adı** | Dispatch |
| **E-posta Altyapısı** | EmailWiz (Postfix + Dovecot) |
| **Backend** | Ruby on Rails 8 (API modu) |
| **Frontend** | Vite + React 18 + TypeScript |
| **Veritabanı** | PostgreSQL |
| **Cache / Queue** | Redis + Sidekiq |
| **IMAP Bridge** | mail_room gem |
| **Stil** | Tailwind CSS (siyah/beyaz tema) |
| **Test Ortamı** | Docker Compose (domain gerekmez) |

---

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────────┐
│                     DISPATCH                         │
│                                                      │
│  ┌──────────┐    ┌────────────┐    ┌─────────────┐  │
│  │  React   │◄──►│ Rails API  │◄──►│  Postfix /  │  │
│  │  (Vite)  │    │  (JSON)    │    │   Dovecot   │  │
│  └──────────┘    └─────┬──────┘    └─────────────┘  │
│                        │                             │
│            ┌───────────┼───────────┐                 │
│            ▼           ▼           ▼                 │
│       PostgreSQL     Redis      Sidekiq              │
│                     (Cache)    (Workers)             │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              AI Layer (Optional)             │   │
│  │   Gemini API | Claude API | OpenAI API       │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### E-posta Akışı

```
Gelen Mail (Postfix)
        │
        ▼
   mail_room (IMAP polling)
        │
        ▼
  ActionMailbox (Rails)
        │
        ▼
  DispatchMailboxRouter
        │
        ├── Yeni gönderici? ──► Approval Queue (IMAP: Approvals klasörü)
        │
        ├── Onaylı gönderici? ──► Inbox
        │
        ├── Speakeasy Code içeriyor? ──► Inbox (trusted)
        │
        └── Reddedilmiş? ──► Trash / Block
```

---

## 📁 Dizin Yapısı

```
dispatch/
├── emailwiz/                  # EmailWiz kurulum scripti (mevcut)
├── backend/                   # Ruby on Rails API
│   ├── app/
│   │   ├── mailboxes/         # ActionMailbox işleyicileri
│   │   ├── models/            # Email, Contact, Label, RssFeed, CalendarEvent...
│   │   ├── workers/           # Sidekiq workers (RSS, AI processing)
│   │   ├── services/
│   │   │   ├── ai/            # Gemini, Claude, OpenAI adaptörleri
│   │   │   ├── email/         # IMAP, SMTP, spy pixel proxy
│   │   │   └── rss/           # RSS fetcher servisi
│   │   └── controllers/api/v1/
│   ├── config/
│   └── Gemfile
├── frontend/                  # Vite + React
│   ├── src/
│   │   ├── views/
│   │   │   ├── Email/         # E-posta modülü (Thunderbird tarzı)
│   │   │   ├── Calendar/      # Dikey takvim modülü
│   │   │   ├── Feed/          # RSS akış modülü
│   │   │   ├── Dashboard/     # AI pano (notlar, kodlar, kargo vs.)
│   │   │   ├── Auth/          # Kayıt / Giriş (tam ekran)
│   │   │   └── Settings/      # Ayarlar sayfaları
│   │   ├── components/
│   │   └── store/             # Zustand state management
│   └── package.json
├── docker/
│   ├── docker-compose.yml     # Lokal test ortamı
│   ├── mailserver/            # docker-mailserver config
│   └── nginx/                 # Reverse proxy + image proxy config
├── AGENTS.md                  # Bu dosya
└── README.md
```

---

## 🎨 UI/UX Tasarım Sistemi

### Tema: Siyah/Beyaz Minimalist

```css
/* Renk Paleti */
--bg-primary:     #0a0a0a;   /* Ana arka plan */
--bg-secondary:   #111111;   /* Panel arka planı */
--bg-tertiary:    #1a1a1a;   /* Kart/hover arka planı */
--border:         #222222;   /* Kenarlıklar */
--text-primary:   #ffffff;   /* Ana metin */
--text-secondary: #999999;   /* İkincil metin */
--text-muted:     #444444;   /* Soluk metin */
--accent:         #ffffff;   /* Vurgu (beyaz buton) */
--accent-hover:   #e0e0e0;   /* Buton hover */
--danger:         #ff4444;   /* Silme / red */
--success:        #44ff88;   /* Onay / kabul */
--warning:        #ffaa00;   /* Uyarı / önemli */
```

### Navigasyon Yapısı

```
┌──────────────────────────────────────────────────────┐
│  📅 Calendar    │    📧 Email    │    📰 Feed (RSS)   │
│   (sol, ~25%)   │  (orta, ~50%) │    (sağ, ~25%)     │
└──────────────────────────────────────────────────────┘
```

- Üst menüden 3 ana bölüme geçiş yapılabilir
- Varsayılan görünüm: Email ortada büyük, diğerleri küçük panel
- Tam ekran modunda tek bölüm görünebilir

---

## 📧 E-posta Modülü

### Temel Özellikler (Thunderbird Benzeri)
- Gelen Kutusu, Gönderilenler, Taslaklar, Çöp Kutusu
- Mail okuma, yazma, yanıtlama, yönlendirme
- Çoklu hesap desteği
- Arama (konu, gövde, gönderici)
- Etiket/Label sistemi
- Thread görünümü

### Onay Sistemi (Approval Queue) ⭐
- İlk kez gelen gönderici → `Approvals` IMAP klasörüne düşer
- Onay sayfası: Gönderici bilgisi, mail içeriği, Onayla / Reddet butonları
- **Onay olmadan cevap verilebilir** (cevap verilince otomatik onay sorulur)
- Onaylanan gönderici → `approved_senders` tablosuna eklenir
- Bir sonraki mailler direkt Inbox'a düşer
- Ayarlardan: Onayla, Reddet, Önemli işaretle, Listeden çıkar

**Veritabanı:**
```ruby
create_table :sender_rules do |t|
  t.references :user
  t.string :email_address,  null: false
  t.string :domain          # wildcard @domain.com desteği
  t.string :status          # approved | blocked | important
  t.datetime :approved_at
  t.timestamps
end
```

### Önemli Etiket Sistemi
- Mail adresine "Önemli" (⭐) etiketi verilebilir
- Önemli kişilerden gelen mailler ayrı görünümde listelenir
- Ayarlar > Kişiler sayfasından yönetilebilir

### Thread Merge (Birleştirme) ⭐
- Birden fazla thread'i seçip "Birleştir" yapılabilir
- Birleştirilen thread'ler kronolojik sırayla tek konumuş gibi gösterilir
- Orijinal thread'ler `merged_into_thread_id` ile işaretlenir

**Veritabanı:**
```ruby
create_table :email_threads do |t|
  t.references :user
  t.string :subject
  t.references :merged_into, foreign_key: { to_table: :email_threads }
  t.timestamps
end
```

### Speakeasy Code ⭐
- Kullanıcı özel, zamanlı kod üretir (örn: `DISPATCH-ABC123-2026`)
- Kod son kullanma tarihi belirlenir (1 gün, 1 hafta, 1 ay, tek kullanım)
- Gelen mailde bu kod varsa → direkt Inbox'a düşer (trusted)
- Kod payload'ı mail subject veya body'de aranır
- Ayarlar > Speakeasy Codes sayfasından yönetilir

**Veritabanı:**
```ruby
create_table :speakeasy_codes do |t|
  t.references :user
  t.string :code,           null: false
  t.string :label           # "Müşteri kodu", "Freelance proje" vs.
  t.datetime :expires_at
  t.boolean :single_use,    default: false
  t.boolean :used,          default: false
  t.timestamps
end
```

### Spy Pixel Engelleme ⭐
**Nasıl Çalışır:**
1. Mail HTML'i parse edilir, tüm `<img src="...">` tagları tespit edilir
2. Dış domain URL'leri Rails'deki `/api/v1/image_proxy?url=...` endpoint'ine yönlendirilir
3. Rails backend URL'yi kendi IP'sinden çeker ve döner
4. Kullanıcının IP'si asla dış sunuculara iletilmez
5. Bilinen tracker domain listesi tutulur, bunlar hiç yüklenmez (1x1 beyaz pixel döner)

**Bilinen Tracker Domainler (config/email_trackers.yml):**
- `tracking.mailchimp.com`, `click.sendgrid.net`, `trk.klaviyo.com`
- `open.convertkit.com`, `t.dripemail.com`, `links.hubspot.com`
- `pixel.hubspot.com`, `t.sidekickopen.com` ve benzerleri

```ruby
# app/services/email/image_proxy_service.rb
class Email::ImageProxyService
  TRACKER_DOMAINS = YAML.load_file(Rails.root.join("config/email_trackers.yml"))

  def self.rewrite_html(html)
    doc = Nokogiri::HTML(html)
    doc.css("img").each do |img|
      src = img["src"]
      next if src.blank? || src.start_with?("data:")
      img["src"] = proxy_url(src)
      img["data-original-src"] = src
    end
    doc.to_html
  end

  def self.is_tracker?(url)
    uri = URI.parse(url)
    TRACKER_DOMAINS.any? { |domain| uri.host&.include?(domain) }
  rescue URI::InvalidURIError
    true  # Şüpheli URL'leri engelle
  end

  def self.proxy_url(url)
    "/api/v1/image_proxy?url=#{CGI.escape(url)}"
  end

  # SSRF koruması
  BLOCKED_IP_RANGES = [
    IPAddr.new("10.0.0.0/8"),
    IPAddr.new("172.16.0.0/12"),
    IPAddr.new("192.168.0.0/16"),
    IPAddr.new("127.0.0.0/8"),
  ].freeze

  def self.safe_external_url?(url)
    uri = URI.parse(url)
    return false unless %w[http https].include?(uri.scheme)
    ip = IPSocket.getaddress(uri.host)
    BLOCKED_IP_RANGES.none? { |range| range.include?(IPAddr.new(ip)) }
  rescue
    false
  end
end
```

---

## 📅 Takvim Modülü

### Tasarım: Dikey Kaydırmalı Takvim

Klasik grid takvim yerine **üstten aşağıya akan** dikey görünüm:

```
┌─────────────────────────────────────┐
│  < Önceki Hafta    Hafta 34  >      │
├─────────────────────────────────────┤
│  PAZARTESİ  22 Ağustos              │
│  ────────────────────────────────── │
│  09:00  📅 Toplantı                  │
│  14:00  ✈️  İstanbul → Ankara uçuşu  │
│                                     │
│  SALI    23 Ağustos                 │
│  ────────────────────────────────── │
│  (Etkinlik yok)                     │
│                                     │
│  ÇARŞAMBA 24 Ağustos                │
│  ────────────────────────────────── │
│  11:30  📦 Kargo teslimi (DHL)       │
└─────────────────────────────────────┘
```

- Scroll ile haftalar arasında geçiş
- Günlük ve haftalık görünüm toggle'ı
- E-posta benzeri etkinlik oluşturma formu
- AI tarafından tespit edilen etkinlikler otomatik eklenir (onay ile)

**Veritabanı:**
```ruby
create_table :calendar_events do |t|
  t.references :user
  t.string :title
  t.text :description
  t.string :location
  t.datetime :starts_at
  t.datetime :ends_at
  t.boolean :all_day, default: false
  t.string :source         # manual | ai_extracted | email
  t.references :email
  t.string :color
  t.jsonb :attendees,      default: []
  t.timestamps
end
```

---

## 📰 RSS Feed Modülü

### Özellikler
- Kullanıcı istediği kadar RSS kaynağı ekleyebilir
- Her kaynak için güncelleme aralığı ayarlanabilir (5dk, 15dk, 1sa, 6sa)
- Makaleler okundu/okunmadı olarak işaretlenebilir
- Kategorilere ayrılabilir (Teknoloji, Haberler, Finans vs.)

**Veritabanı:**
```ruby
create_table :rss_feeds do |t|
  t.references :user
  t.string :url,          null: false
  t.string :title
  t.string :description
  t.string :favicon_url
  t.string :category
  t.integer :refresh_interval, default: 15  # dakika
  t.datetime :last_fetched_at
  t.timestamps
end

create_table :rss_items do |t|
  t.references :rss_feed
  t.string :guid,         null: false
  t.string :title
  t.text :content
  t.string :url
  t.string :author
  t.datetime :published_at
  t.boolean :read,        default: false
  t.boolean :starred,     default: false
  t.timestamps
end
```

**Sidekiq Worker:**
```ruby
# app/workers/rss_fetch_worker.rb
class RssFetchWorker
  include Sidekiq::Worker
  sidekiq_options queue: :rss, retry: 3

  def perform(rss_feed_id)
    feed = RssFeed.find(rss_feed_id)
    items = FeedParser.fetch(feed.url)
    items.each do |item|
      feed.rss_items.find_or_create_by(guid: item[:guid]) do |ri|
        ri.assign_attributes(item)
      end
    end
    feed.update!(last_fetched_at: Time.current)
  end
end
```

---

## 🤖 Yapay Zeka Entegrasyonu

### Desteklenen Sağlayıcılar
- **Google Gemini** (Gemini 1.5 Pro / Flash)
- **Anthropic Claude** (Claude 3.5 Sonnet / Haiku)
- **OpenAI** (GPT-4o / GPT-4o mini)

### Önemli Kural: AI özellikli butonlar/menüler, kullanıcı API key eklemedikçe görünmez!

### Her Gelen Mail İçin AI Analiz Kategorileri

```
type: "invoice"        → Fatura kartı (tutar, son ödeme, hesap no)
type: "tracking"       → Kargo takip kartı (takip no, durum, teslim tarihi)
type: "ticket"         → Bilet kartı (sefer, koltuk, rezervasyon no)
type: "bank"           → Banka bildirimi kartı
type: "verification"   → Doğrulama kodu kartı (tek tıkla kopyala)
type: "travel"         → Seyahat kartı (takvime ekleme seçeneği, ÖNCELİKLİ)
type: "otp"            → OTP kodu kartı (büyük görünüm, geri sayım)
type: "order"          → Sipariş kartı (sipariş no, adres, ürünler)
type: "meeting"        → Toplantı önerisi (takvime ekleme)
type: "general"        → Sadece özet
```

### AI Prompt Şablonu (Detaylı)

```
Sen bir e-posta analiz asistanısın. Aşağıdaki e-postayı analiz et ve yapılandırılmış JSON döndür.

E-POSTA:
Gönderici: {from}
Konu: {subject}
Tarih: {date}
İçerik: {body}

GÖREV:
Bu e-postadan kullanıcıya yararlı olabilecek tüm önemli bilgileri çıkar.

TALİMATLAR:
- E-postanın dilini tespit et (language alanına yaz)
- Hassas verileri (banka şifresi, CVV, TC kimlik no) ASLA dahil etme
- Eğer bir kategoriye uymuyorsa type: "general" kullan
- Takvime eklenebilecek tarihler için calendar_suggestion ekle
- Pano'da tıklanabilir/kopyalanabilir öğeleri actionable_items listesine ekle
- Seyahat içeriyorsa priority: "high" yap
- Kargo takipte bugün teslimat varsa priority: "high" yap
- OTP/doğrulama kodunda expires_at tahmin et

ÇIKTI FORMATI (JSON):
{
  "type": "invoice|tracking|ticket|bank|verification|travel|otp|order|meeting|general",
  "language": "tr|en|de|fr|...",
  "summary": "Kısa özet (max 2 cümle)",
  "sender_context": "Kimin gönderdiği ve genel bağlam",
  "actionable_items": [
    {
      "label": "Sipariş No",
      "value": "TRK123456",
      "copyable": true,
      "url": null
    },
    {
      "label": "Kargo Takip",
      "value": "1234567890",
      "copyable": true,
      "url": "https://www.dhl.com/tr/track?id=1234567890"
    }
  ],
  "calendar_suggestion": {
    "title": "Kargo Teslimi",
    "date": "2026-08-25",
    "time": "14:00",
    "all_day": false,
    "description": "DHL Express - TRK123456"
  },
  "priority": "high|medium|low",
  "tags": ["kargo", "sipariş"],
  "expires_at": "2026-08-26T00:00:00Z"
}
```

### Dashboard Pano Öncelik Sıralaması
1. 🔴 Seyahat (aynı gün / 24 saat içinde)
2. 🟠 OTP/Doğrulama kodları (expire geri sayımı gösterir)
3. 🟡 Kargo (bugün teslim edilecekler)
4. 🟡 Faturalar (son ödeme yaklaşanlar, 3 gün içinde)
5. ⚪ Bilet, banka bildirimi, sipariş
6. ⚪ Genel özet

---

## 👤 Kayıt ve Kimlik Doğrulama

### Kayıt Akışı — Tam Ekran Step UI

```
Adım 1: Ad & Soyad       → büyük tek input, ortada, animate
Adım 2: E-posta adresi   → sistemdeki geçerli bir mailbox olmalı
Adım 3: Şifre            → güçlü şifre zorunluluğu, strength indicator
Adım 4: Profil fotoğrafı → opsiyonel, sürükle-bırak veya geç
```

**Profil Fotoğrafı Güvenliği:**
- Kullanıcının tarayıcısından Rails'e multipart upload
- Rails: MIME type validation, magic bytes kontrolü, max 5MB
- Sunucu kendi IP'sinden işlem yapar, kullanıcı IP'si dış servislere gitmez
- ActiveStorage ile yerel veya S3 depolama

**EmailWiz Mailbox Provisioning:**
```ruby
# app/services/email/mailbox_provisioner.rb
class Email::MailboxProvisioner
  def self.create(username, password, domain)
    # Dovecot passdb güncellemesi
    # Gerçek implementasyon: doveadm veya /etc/dovecot/passwd dosyası
    system("echo '#{username}@#{domain}:#{password}' >> /etc/dovecot/passwd")
  end

  def self.delete(username, domain)
    system("doveadm user delete #{username}@#{domain}")
  end
end
```

---

## ⚙️ Ayarlar Sayfası Yapısı

```
⚙️ Ayarlar
├── 👤 Profil (Ad, Soyad, Fotoğraf, Şifre)
│
├── 👥 Kişi Yönetimi
│   ├── Onaylananlar → Düzenle, Kaldır, Blokla
│   ├── Reddedilenler → Düzenle, Kaldır, Onayla
│   └── Önemli → Düzenle, Kaldır
│
├── 🔑 Speakeasy Codes
│   ├── Aktif kodlar (etiket, süre, kullanım durumu)
│   ├── Yeni kod oluştur (etiket, süre, tek kullanım?)
│   └── Kodu iptal et / kopyala
│
├── 🤖 Yapay Zeka
│   ├── Gemini API Key (şifreli sakla)
│   ├── Claude API Key (şifreli sakla)
│   ├── OpenAI API Key (şifreli sakla)
│   ├── Aktif provider seç
│   └── Bağlantıyı test et
│
├── 📰 RSS Kaynakları
│   ├── Kaynak listesi (favicon, başlık, son güncelleme)
│   ├── Yeni kaynak ekle (URL, kategori, sıklık)
│   └── Sil / Düzenle
│
├── 🛡️ Gizlilik & Güvenlik
│   ├── Spy pixel engelleme: Açık/Kapalı
│   ├── Tracker domain listesini görüntüle
│   └── 2FA (TOTP - Google Authenticator uyumlu)
│
└── 📬 E-posta Ayarları
    ├── Onay sistemi: Açık/Kapalı
    ├── Varsayılan imza
    └── Bildirim tercihleri
```

---

## 🐳 Docker — Lokal Test Ortamı

**NOT: Gerçek domain veya sunucu gerekmez. Tamamen lokal test.**

### `docker/docker-compose.yml`

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: dispatch_dev
      POSTGRES_USER: dispatch
      POSTGRES_PASSWORD: dispatch_secret
    volumes:
      - pg_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # docker-mailserver: tam Postfix+Dovecot stack, domain gerekmez lokal için
  mailserver:
    image: ghcr.io/docker-mailserver/docker-mailserver:latest
    hostname: mail
    domainname: dispatch.local
    environment:
      - ENABLE_SPAMASSASSIN=0
      - ENABLE_CLAMAV=0
      - ENABLE_FAIL2BAN=0
      - SSL_TYPE=self-signed
      - POSTMASTER_ADDRESS=postmaster@dispatch.local
      - PERMIT_DOCKER=network
      - LOG_LEVEL=debug
    ports:
      - "25:25"
      - "143:143"
      - "587:587"
      - "993:993"
    volumes:
      - ./mailserver/data:/var/mail
      - ./mailserver/config:/tmp/docker-mailserver
    cap_add:
      - NET_ADMIN

  backend:
    build: ../backend
    environment:
      DATABASE_URL: postgresql://dispatch:dispatch_secret@postgres/dispatch_dev
      REDIS_URL: redis://redis:6379
      MAIL_HOST: mailserver
      MAIL_DOMAIN: dispatch.local
      RAILS_ENV: development
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
      - mailserver
    volumes:
      - ../backend:/app

  sidekiq:
    build: ../backend
    command: bundle exec sidekiq
    environment:
      DATABASE_URL: postgresql://dispatch:dispatch_secret@postgres/dispatch_dev
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  frontend:
    build: ../frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3000
    volumes:
      - ../frontend:/app

volumes:
  pg_data:
```

### Test Kullanıcısı Kurulumu

```bash
# Mailserver başladıktan sonra:
docker exec mailserver setup email add test@dispatch.local Test1234!
docker exec mailserver setup email add sender@dispatch.local Sender123!

# Lokal DNS (hosts dosyası):
echo "127.0.0.1 mail.dispatch.local" | sudo tee -a /etc/hosts
```

### Alternatif: Mailpit (Daha Hızlı Geliştirme)

```yaml
  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "8025:8025"   # Web UI - http://localhost:8025
      - "1025:1025"   # SMTP
```

---

## 🔌 API Endpoints

### Auth
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
DELETE /api/v1/auth/logout
GET    /api/v1/auth/me
```

### E-posta
```
GET    /api/v1/emails                    # Liste (inbox, approval, vs.)
GET    /api/v1/emails/:id                # Tek mail
POST   /api/v1/emails                    # Gönder
DELETE /api/v1/emails/:id                # Sil
POST   /api/v1/emails/:id/reply          # Yanıtla
POST   /api/v1/emails/:id/forward        # İlet
POST   /api/v1/emails/:id/approve        # Onay kuyruğundan onayla
POST   /api/v1/emails/:id/reject         # Reddet
POST   /api/v1/emails/merge_threads      # Thread birleştir
GET    /api/v1/image_proxy               # Spy pixel proxy endpoint
```

### Kişi Yönetimi
```
GET    /api/v1/sender_rules
POST   /api/v1/sender_rules
PATCH  /api/v1/sender_rules/:id
DELETE /api/v1/sender_rules/:id
```

### Speakeasy Codes
```
GET    /api/v1/speakeasy_codes
POST   /api/v1/speakeasy_codes
DELETE /api/v1/speakeasy_codes/:id
```

### AI Dashboard
```
GET    /api/v1/dashboard                 # Pano kartları (öncelik sırası)
DELETE /api/v1/dashboard/:id             # Kartı kapat
POST   /api/v1/dashboard/:id/add_to_calendar   # Takvime ekle
```

### Takvim
```
GET    /api/v1/calendar/events
POST   /api/v1/calendar/events
PATCH  /api/v1/calendar/events/:id
DELETE /api/v1/calendar/events/:id
```

### RSS
```
GET    /api/v1/rss/feeds
POST   /api/v1/rss/feeds
DELETE /api/v1/rss/feeds/:id
GET    /api/v1/rss/items
PATCH  /api/v1/rss/items/:id/read
POST   /api/v1/rss/feeds/:id/refresh
```

### Ayarlar
```
GET    /api/v1/settings
PATCH  /api/v1/settings
POST   /api/v1/settings/ai/test
POST   /api/v1/settings/upload_avatar
```

---

## 📋 Geliştirme Fazları

### Faz 1 — Altyapı & Auth (Hafta 1-2)
- [ ] Rails API projesi kurulumu (Rails 8, API modu)
- [ ] PostgreSQL, Redis, Sidekiq konfigürasyonu
- [ ] Docker Compose lokal ortamı kurulumu
- [ ] User modeli ve JWT authentication
- [ ] Tam ekran kayıt UI (adım adım, animasyonlu)
- [ ] EmailWiz/Dovecot mailbox provisioning servisi

### Faz 2 — Core Email (Hafta 2-3)
- [ ] mail_room gem ile IMAP polling
- [ ] ActionMailbox entegrasyonu ve router
- [ ] Gelen kutusu, okuma, yazma, silme
- [ ] Thread görünümü (Thunderbird benzeri)
- [ ] Onay sistemi (Approval Queue)
- [ ] Spy pixel proxy endpoint

### Faz 3 — Smart Features (Hafta 3-4)
- [ ] Speakeasy Code sistemi (üretim, kontrol, iptal)
- [ ] Sender Rules yönetimi (onayla/reddet/önemli)
- [ ] Thread merge özelliği
- [ ] Etiket sistemi
- [ ] Thunderbird benzeri 3 sütun UI

### Faz 4 — AI Integration (Hafta 4-5)
- [ ] Gemini / Claude / OpenAI adapter servisleri
- [ ] EmailAiAnalysisWorker (Sidekiq)
- [ ] Dashboard/Pano UI (kartlar, öncelik sırası)
- [ ] Takvim AI etkinlik önerisi + onay
- [ ] OTP geri sayım kartı

### Faz 5 — Calendar & RSS (Hafta 5-6)
- [ ] Dikey kaydırmalı takvim UI
- [ ] E-posta benzeri etkinlik oluşturma formu
- [ ] RSS fetcher + Sidekiq cron worker
- [ ] RSS okuyucu UI (okundu/yıldız)

### Faz 6 — Polish & Settings (Hafta 6-7)
- [ ] Ayarlar sayfası (tüm bölümler)
- [ ] Gizlilik & güvenlik (2FA, tracker list)
- [ ] Dark theme finalize ve responsive
- [ ] Performans: virtual scroll, lazy loading
- [ ] E2E testler (Cypress)
- [ ] RSpec unit testleri

---

## 🛡️ Güvenlik Standartları

- Tüm API endpoint'leri JWT ile korunur (Authorization: Bearer header)
- Rate limiting: Rack::Attack (login: 5/min, register: 3/min, API genel: 100/min)
- SQL injection: ActiveRecord parametrize sorgular — ham SQL yasak
- XSS: React'ın varsayılan escaping + Nokogiri HTML sanitize (mail body için)
- CORS: Yalnızca frontend origin'e izin ver (production'da)
- API key'leri: `attr_encrypted` gem ile AES-256-GCM şifreli
- Profil fotoğrafı: MIME validation + magic bytes kontrolü + max 5MB
- Image proxy: SSRF koruması (RFC1918 adreslerine erişim engeli)
- E-posta gövdesi: İzin verilenler listesiyle sanitize (script, iframe engeli)

---

## 🧰 Gem / Paket Listesi

### Rails Backend (Gemfile)
```ruby
gem "rails", "~> 8.0"
gem "pg"                         # PostgreSQL
gem "redis"                      # Redis
gem "sidekiq"                    # Background jobs
gem "jwt"                        # JSON Web Tokens
gem "bcrypt"                     # Şifre hash'i (Rails default)
gem "rack-attack"                # Rate limiting
gem "nokogiri"                   # HTML parse (spy pixel rewriter)
gem "mail"                       # Mail parse/compose
gem "mail_room"                  # IMAP mailbox polling
gem "attr_encrypted"             # API key AES şifreleme
gem "feedjira"                   # RSS/Atom feed parse
gem "faraday"                    # HTTP client (image proxy, AI API)
gem "rack-cors"                  # CORS yönetimi
gem "rotp"                       # 2FA TOTP
gem "rqrcode"                    # 2FA QR kod üretimi

group :development, :test do
  gem "dotenv-rails"
  gem "rspec-rails"
  gem "factory_bot_rails"
  gem "faker"
end
```

### Frontend (package.json)
```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "typescript": "^5",
    "vite": "^5",
    "zustand": "^4",
    "@tanstack/react-query": "^5",
    "tailwindcss": "^3",
    "lucide-react": "latest",
    "date-fns": "^3",
    "dompurify": "^3",
    "@tiptap/react": "^2",
    "framer-motion": "^11",
    "react-virtual": "^3"
  }
}
```

---

## 📝 Agent Talimatları

Projeye katkıda bulunan her AI agent aşağıdaki kurallara UYMALDIR:

1. **Bu AGENTS.md'yi referans al** — Özellik eklemeden önce tasarım kararlarına uygunluğu kontrol et
2. **Veritabanı şemasını genişlet, değiştirme** — Mevcut alanları silme veya rename etme
3. **Test yaz** — Her yeni servis ve worker için RSpec test ekle
4. **API key'lerini loglama** — `attr_encrypted` verileri hiçbir zaman plain text log'a yazma
5. **AI guard kullan** — `if current_user.ai_configured?` olmadan AI endpoint yapma
6. **SSRF korumasını atlatma** — Image proxy güvenlik kontrollerini devre dışı bırakma
7. **Spy pixel listesini güncelle** — Yeni tracker tespit edilince `config/email_trackers.yml` güncelle
8. **Faz sırasına uyu** — Bağımlılıkları olan özellikler için önceki faz tamamlanmış olmalı
9. **Docker'da test et** — Lokal değişiklikleri Docker Compose ortamında test et
10. **Türkçe UI desteği** — i18n sistemi kurulana kadar component içinde Türkçe sabit metin kullan

---

*Son güncelleme: Ağustos 2026 | Dispatch v0.1.0-planning*
