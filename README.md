# ⚡ Dispatch — Akıllı & Modern E-Posta İstemcisi

> **Dispatch**, EmailWiz (Postfix + Dovecot) altyapısı üzerine inşa edilmiş; yapay zeka destekli pano (Gemini, Claude, OpenAI), e-posta grupları (`@grup`), onay kuyruğu, dikey takvim, RSS akışları ve casus piksel koruması içeren bağımsız ve güvenli bir e-posta istemcisidir.

---

## 🏗️ Teknoloji Yığını (Tech Stack)

- **Backend:** Ruby on Rails 8 (API Modu) + Sidekiq
- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS + Framer Motion
- **Veritabanı:** PostgreSQL 16
- **Önbellek & Kuyruk:** Redis 7
- **E-Posta Sunucusu:** Postfix + Dovecot (Lokalde `docker-mailserver` / Üretimde `EmailWiz`)
- **Tasarım:** Siyah/Beyaz Minimalist & Modern Arayüz

---

## 🚀 Canlı Sunucuya 1-Komutla Kurulum (Production)

Temiz bir Ubuntu/Debian sunucuya format attıktan sonra tek komutla tüm bağımlılıkları (Nginx, Postfix, Dovecot, PostgreSQL, Redis, SSL) kurup web kurulum sihirbazını başlatmak için:

```bash
git clone https://github.com/noirlang/dispatch.git
cd dispatch
sudo bash install.sh
```

Script çalıştığında sunucunun IP adresini otomatik tespit eder, tüm servisleri ayağa kaldırır ve ekrana web bağlantınızı verir:
```text
=============================================================
✔ DISPATCH BAŞARIYLA BAŞLATILDI!
=============================================================
Şimdi bilgisayarınızdan veya telefonunuzdan şu adrese gidin:
👉 http://SUNUCU_IP/setup

Açılan web ekranında:
  1. Alan adınızı (örn: noirlang.tr) girin
  2. Yönetici hesabınızı belirleyin
  3. Cloudflare API Token'ı yapıştırıp tek tıkla kurun!
=============================================================
```

---

### 2. Docker ile Lokal Geliştirme Ortamını Başlatma

Dispatch, bağımlılıkları (PostgreSQL, Redis, Mailserver) Docker ile tek komutla ayağa kaldırır.

```bash
# 1. Docker servislerini başlatın
cd docker
docker compose up -d

# 2. Test e-posta hesaplarını oluşturun
docker exec mailserver setup email add test@dispatch.local Test1234!
docker exec mailserver setup email add melih@dispatch.local Melih1234!
docker exec mailserver setup email add ilknur@dispatch.local Ilknur1234!

# 3. Lokal DNS yapılandırması (/etc/hosts dosyasına ekleyin)
echo "127.0.0.1 mail.dispatch.local dispatch.local" | sudo tee -a /etc/hosts
```

---

### 3. Backend & Veritabanı Kurulumu

```bash
cd ../backend

# 1. Gem bağımlılıklarını yükleyin
bundle install

# 2. Veritabanını oluşturun ve migrasyonları uygulayın
DATABASE_URL="postgresql://dispatch:dispatch_secret@localhost:5432/dispatch_dev" bin/rails db:create db:migrate

# 3. Rails API Sunucusunu başlatın (Port 3000)
DATABASE_URL="postgresql://dispatch:dispatch_secret@localhost:5432/dispatch_dev" \
REDIS_URL="redis://localhost:6379" \
SECRET_KEY_BASE="dev_secret_key_base_dispatch_32chars_minimum_ok" \
bin/rails s -p 3000 -b 0.0.0.0
```

---

### 4. Frontend Kurulumu ve Başlatma

```bash
cd ../frontend

# 1. NPM paketlerini yükleyin
npm install

# 2. Vite geliştirme sunucusunu başlatın (Port 5173)
npm run dev -- --host 0.0.0.0 --port 5173
```

Arayüze erişmek için tarayıcınızda açın: **[http://localhost:5173](http://localhost:5173)**

---

## 🌐 Gerçek Sunucuya Kurulum (EmailWiz + Postfix + Dovecot)

Dispatch'i gerçek bir Linux sunucusuna (Ubuntu 22.04 / 24.04 veya Debian) kurmak için:

### 1. EmailWiz ile Postfix & Dovecot Kurulumu
```bash
cd emailwiz
sudo bash emailwiz.sh
```
Script çalıştıktan sonra alan adınızı (`example.com`) girin. Dovecot, Postfix, OpenDKIM ve SpamAssassin otomatik olarak kurulacaktır.

### 2. DNS Kayıtları (Gerekli Tablo)

| Kayıt Türü | İsim (Host) | Değer (Value) | Açıklama |
|---|---|---|---|
| **A** | `mail.example.com` | `SUNUCU_IP_ADRESI` | Postfix/Dovecot Mail Host |
| **MX** | `example.com` | `mail.example.com` (Öncelik: 10) | Mail Yönlendirme |
| **TXT (SPF)** | `example.com` | `"v=spf1 mx ~all"` | SPF İzin Kaydı |
| **TXT (DKIM)** | `mail._domainkey.example.com` | `v=DKIM1; k=rsa; p=...` | `/etc/opendkim/keys/...` dosyasındaki anahtar |
| **TXT (DMARC)** | `_dmarc.example.com` | `"v=DMARC1; p=none; sp=none;"` | DMARC Güvenlik Protokolü |

---

## 🌟 Öne Çıkan Özellikler & Kullanım

### 1. 👥 E-Posta Grupları (`@grup`)
- **Grup Oluşturma:** `Ayarlar > Kişiler > E-posta Grupları` sekmesine gidin. Grup adı (örn: `ekip`) ve üyelerin e-posta adreslerini girin.
- **Toplu Gönderim:** Yeni e-posta yazarken `Kime (To)` alanına `@ekip` yazdığınızda veya sol menüdeki `@ekip` butonuna tıkladığınızda e-posta gruptaki tüm kişilere otomatik olarak ayrı ayrı iletilir.

### 2. ⭐ Önemli Kişi (VIP) & 🚩 Sarı Bayrak
- **Önemli Kişi:** Gelen maili okurken üst bardaki ⭐ ikonuna tıklayarak göndericiyi tek tıkla VIP yapabilirsiniz.
- **Sarı Bayrak & Beyaz Kenar Çizgisi:** Liste kartındaki bayrağa tıklandığında sarı bayrak ve kartın solunda belirgin beyaz çizgi göstergesi aktifleşir.

### 3. 🤖 Canlı AI Modelleri & Pano Entegrasyonu
- **Canlı Modeller:** `Ayarlar > Yapay Zeka` sayfasında API anahtarınızı (Gemini, Claude, OpenAI) girdiğinizde, resmi API'den en güncel modeller canlı olarak listelenir.
- **Akıllı Pano Kartları:** Gelen e-postalardaki kargo takip numaraları, seyahat rezervasyonları, biletler, faturalar ve OTP kodları otomatik ayıklanıp öncelik sırasına göre Panoya düşer.

### 4. 🛡️ Casus Piksel (Spy Pixel) Engelleme
- Dış görseller yerel Rails proxy endpoint'i (`/api/v1/image_proxy`) üzerinden taranır. İzleyici domainler engellenir ve kullanıcının IP adresi kesinlikle dış dünyaya sızdırılmaz.

### 5. 🔑 Speakeasy Güvenlik Kodları
- Bilinmeyen kişilere süreli veya tek kullanımlık kod verin (örn: `DISPATCH-VIP-2026`). Bu kodu içeren e-postalar onay kuyruğuna takılmadan doğrudan Gelen Kutusu'na düşer.

---

## 🛡️ Yönetici Paneli & Güvenli Güncelleme (`/admin`)

Dispatch sistem yönetimi, sunucu durum takibi ve güvenli çekirdek güncellemeleri için bağımsız bir **`/admin` Yönetici Paneline** sahiptir.

- **Yönetici Paneli URL:** `http://localhost:5173/admin` (veya `https://yourdomain.com/admin`)
- **Varsayılan Şifre:** `admin1234` (EmailWiz kurulum scriptinde veya `/admin > Admin Şifresi` sekmesinden kolayca değiştirilebilir).

### /admin Paneli Üzerinden Sıfır Veri Kayıplı Güncelleme:
1. Tarayıcınızdan `/admin` sayfasına gidin ve yönetici şifrenizle giriş yapın.
2. **"Sistem Güncelleme"** sekmesinde `noirlang/dispatch` deposundaki son commitleri inceleyin.
3. **"Sistemi Güvenle Güncelle"** butonuna basın. Güncelleme sırasında e-postalarınız, kullanıcı hesaplarınız ve ayarlarınız **%100 korunur**.

### Terminalden Manuel Güncelleme:
```bash
# 1. Kodları çekin
git pull origin master

# 2. Veri kaybı olmadan yeni veritabanı tablolarını ekleyin
cd backend && bundle install && bin/rails db:migrate

# 3. Frontend varlıklarını derleyin
cd ../frontend && npm install && npm run build
```

---

## ❓ Sık Karşılaşılan Sorunlar & Çözümler (FAQ)

### Soru 1: E-postalar onay kuyruğuna (`approvals`) düşüyor, gelen kutusuna nasıl alırım?
- İlk kez mail atan göndericiler güvenlik gereği onay kuyruğuna düşer. Mail okuyucusundan **"Onayla"** butonuna bastığınızda veya o kişiye siz e-posta gönderdiğinizde sonraki tüm iletileri doğrudan Gelen Kutusu'na gelir.

### Soru 2: `@ekip` grubu ile gönderim yaparken hata alıyorum?
- `Ayarlar > Kişiler > E-posta Grupları` alanından grubun tanımlandığından ve en az 1 üye e-posta adresi içerdiğinden emin olun.

### Soru 3: AI Modelleri kutusu boş geliyor?
- `Ayarlar > Yapay Zeka` sayfasında geçerli bir Google Gemini, Anthropic Claude veya OpenAI API anahtarı girip **"Bağlantıyı Test Et & Modelleri Getir"** butonuna tıklayın.

---

## 📄 Lisans
Bu proje açık kaynaklıdır ve MIT lisansı altında dağıtılmaktadır.
