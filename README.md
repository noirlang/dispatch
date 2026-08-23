<div align="center">

<p align="center">
  <strong><a href="README.md">🇹🇷 Türkçe</a></strong> &nbsp;|&nbsp; <strong><a href="README-EN.md">🇬🇧 English</a></strong>
</p>

# Dispatch

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="frontend/public/dispatch.png">
    <img src="frontend/public/dispatch.png" width="88" alt="dispatch logo" />
  </picture>
</p>

<p align="center">
  <strong>Çift yönlü Thunderbird IMAP senkronizasyonu, e-posta ile blog yayınlama, onay kuyruğu, yapay zeka panosu ve gizlilik odaklı mimariye sahip modern ve akıllı e-posta platformu.</strong>
</p>

[Web Sitesi](https://mail.noirlang.tr)

</div>

## Özellikler

- **Çift Yönlü Thunderbird & Dovecot IMAP Senkronizasyonu:** Gelen Kutusu, Gönderilenler, Taslaklar, Çöp Kutusu ve Onay Bekleyenler klasörleri için masaüstü istemciler (Thunderbird, Apple Mail vb.) ile Dispatch Webmail arasında `<1ms` hızında anlık Maildir dosya teslimatı ve gerçek zamanlı senkronizasyon.
- **E-Posta ile Blog Yayınlama Motoru:** Sadece `blog@alanadiniz.com` adresine e-posta göndererek dahili genel blogda (`/@kullanici_adi/yazi-basligi`) makale yayınlama. Yazarlar, `Rm: <Blog Başlığı>` veya `rm: <slug>` konulu bir mail atarak yayınladıkları yazıları anında sistemden silebilir.
- **Gönderici Onay Kuyruğu (Approval Queue):** İlk kez gelen göndericileri otomatik olarak `Onay Bekleyenler` klasörüne yönlendirme; tek tıkla Onayla / Engelle seçenekleri, e-postaya yanıt verildiğinde otomatik beyaz listeye ekleme ve fiziksel Maildir dosya taşımaları.
- **Gizlilik Odaklı Görsel Vekili & Takip Pikselleri Engelleme:** E-postalardaki harici takip pikselleri ve uzaktaki görseller, kullanıcı IP'sini gizleyen izole backend proxy servisi üzerinden yüklenir; bilinen tracker domainleri otomatik olarak engellenir ve SSRF koruması sağlanır.
- **Kişi Grupları & Akıllı Takma Adlar:** `@grup_adi` sözdizimiyle (örn. `@ekip`) kişi gruplarına toplu e-posta gönderimi; grup üyelerinin otomatik çözümlenmesi ve tüm üyelere anında dağıtım.
- **Speakeasy VIP Kodları:** Gelen e-postaların hiçbir onay süzgecine takılmadan doğrudan Gelen Kutusu'na düşmesini sağlayan süreli veya tek kullanımlık şifre jetonları (örn. `DISPATCH-VIP-2026`).
- **Çoklu Sağlayıcı Destekli Yapay Zeka Analizi:** Google Gemini, Anthropic Claude veya OpenAI API modelleriyle fatura, OTP/doğrulama kodları, kargo takip numaraları ve uçak/otel biletlerinin otomatik tespiti ve tek tıkla akıllı yanıt taslağı hazırlama.
- **Gelişmiş E-Posta Okuyucu:** Kristal netliğinde okunabilirlik için doğrudan DOM stil enjeksiyonlu dinamik karanlık mod iframe yapısı, dosya eki önizleyicileri ve çok dilli çeviri desteği.
- **Dikey Zaman Çizelgesi Takvimi & RSS Okuyucu:** E-postalardaki toplantı linkleri ve etkinliklerle senkronize dikey akışlı takvim ve Sidekiq arka plan işçileriyle beslenen çok kategorili RSS akış okuyucusu.

## Teknoloji Yığını & Mimari

| Katman | Teknoloji | Amaç |
| --- | --- | --- |
| **Frontend** | Vite + React 18 + TypeScript + Tailwind CSS | Ultra hızlı, duyarlı karanlık/aydınlık temalı webmail arayüzü |
| **Backend API** | Ruby on Rails 8 (API Modu) + ActionMailbox | Gelen e-posta yönlendirme, kimlik doğrulama, iş mantığı ve REST API |
| **Veritabanı** | PostgreSQL 16 | E-postalar, diziler, blog yazıları ve kullanıcılar için ilişkisel veri deposu |
| **İşçiler & Önbellek** | Redis 7 + Sidekiq | Arka plan RSS tarama, yapay zeka analizleri ve asenkron iş kuyrukları |
| **Posta Sunucusu** | Postfix + Dovecot (Maildir++) | Üretim seviyesinde SMTP/IMAP e-posta dağıtım yığını |
| **Ters Vekil (Proxy)** | Nginx | SSL sonlandırma, avatar sunumu ve statik varlık dağıtımı |

## Hızlı Başlangıç & Kurulum

### 1. Canlı Sunucu Tek Komut Kurulumu

Temiz bir Ubuntu / Debian Linux sunucusunda repoyu klonlayıp kurulum scriptini çalıştırın:

```bash
git clone https://github.com/melihemik/dispatch.git
cd dispatch
sudo bash install.sh
```

Alan adınızı, yönetici hesabınızı ve Cloudflare DNS otomasyonunu yapılandırmak için tarayıcınızdan `http://SUNUCU_IP_ADRESINIZ/setup` adresindeki web kurulum sihirbazını takip edin.

### 2. Lokal Docker Test Ortamı

```bash
# 1. Postgres, Redis ve Mailserver'ı başlatın
cd docker
docker compose up -d

# 2. Test e-posta hesapları ekleyin
docker exec mailserver setup email add test@dispatch.local Test1234!
docker exec mailserver setup email add melih@dispatch.local Melih1234!

# 3. Lokal alan adını /etc/hosts dosyasına ekleyin
echo "127.0.0.1 mail.dispatch.local dispatch.local" | sudo tee -a /etc/hosts
```

### 3. Backend Kurulumu

```bash
cd backend
bundle install
DATABASE_URL="postgresql://dispatch:dispatch_secret@localhost:5432/dispatch_dev" bin/rails db:create db:migrate
bin/rails s -p 3000 -b 0.0.0.0
```

### 4. Frontend Kurulumu

```bash
cd frontend
npm install
npm run dev
```

Tarayıcınızdan **[http://localhost:5173](http://localhost:5173)** adresine gidin.

---

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://forgetag.noirlang.tr/sirket.png">
    <img src="https://forgetag.noirlang.tr/sirket.png" width="88" alt="NoirLang logo" />
  </picture>
</p>
