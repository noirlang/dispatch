#!/usr/bin/env bash
set -e

# =============================================================
# 🚀 DISPATCH — 1-KOMUT HIZLI SUNUCU KURUCUSU & BAŞLATICISI
# Debian 11/12 & Ubuntu 20.04/22.04/24.04 Optimize
# =============================================================

# Root yetkisi kontrolü
if [ "$EUID" -ne 0 ]; then
  echo -e "\033[0;31m✖ Lütfen bu scripti root yetkisiyle (sudo bash install.sh) çalıştırın.\033[0m"
  exit 1
fi

DISPATCH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DISPATCH_DIR"

echo -e "\n\033[36m=============================================================\033[0m"
echo -e "\033[36m⚡ DISPATCH E-POSTA & WEBMAIL SUNUCUSU KURULUYOR...\033[0m"
echo -e "\033[36m=============================================================\033[0m\n"

# 1. Sunucu IP adresi ve Swap (RAM Güvencesi - 2GB RAM için)
echo -e "▶ 1. Sunucu IP adresi tespit ediliyor..."
SERVER_IP=$(curl -s -m 5 https://api.ipify.org 2>/dev/null || curl -s -m 5 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
[ -z "$SERVER_IP" ] && SERVER_IP="127.0.0.1"
echo -e "✔ Sunucu IP: \033[32m$SERVER_IP\033[0m\n"

# Swap kontrolü (2GB RAM sunucuların derleme sırasında kilitlenmemesi için - hata verirse sessizce atlar)
if [ "$(free -m 2>/dev/null | awk '/Swap:/ {print $2}' || echo 0)" -lt 1000 ]; then
  echo "▶ RAM güvencesi için 2GB Swap oluşturuluyor..."
  (fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null || true)
  chmod 600 /swapfile 2>/dev/null || true
  mkswap /swapfile 2>/dev/null || true
  swapon /swapfile 2>/dev/null || true
  grep -q "/swapfile" /etc/fstab 2>/dev/null || echo "/swapfile none swap sw 0 0" >> /etc/fstab || true
fi

# 2. Gerekli sistem paketlerini kur
echo -e "▶ 2. Sistem paketleri kuruluyor (PostgreSQL, Redis, Nginx, Node.js, Postfix, Dovecot)..."
export DEBIAN_FRONTEND=noninteractive

apt-get update -y -q
apt-get install -y -q \
  curl wget gnupg2 build-essential git \
  postgresql postgresql-contrib redis-server \
  nginx certbot python3-certbot-nginx \
  postfix postfix-pcre dovecot-imapd dovecot-pop3d opendkim opendkim-tools spamassassin fail2ban ufw \
  ruby-full ruby-bundler libpq-dev zlib1g-dev

# Node.js kontrolü ve kurulumu (Node 20 LTS)
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js kuruluyor..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -q nodejs
fi

# 3. Güvenlik Duvarı Portlarını Aç
echo -e "\n▶ 3. Portlar açılıyor (80, 443, 3000, 25, 587, 993)..."
if command -v ufw >/dev/null 2>&1; then
  for port in 80 443 3000 5173 25 587 993; do
    ufw allow "$port" >/dev/null 2>&1 || true
  done
fi

# 4. PostgreSQL Veritabanı ve Kullanıcısını Hazırla (Otomatik & Güvenli)
echo -e "▶ 4. PostgreSQL veritabanı güvenli şekilde yapılandırılıyor..."
systemctl start postgresql redis-server 2>/dev/null || true

# Kuruluma özel rastgele güçlü 32-karakter şifre üret
PG_PASS=$(openssl rand -hex 16)
DB_NAME="dispatch_prod"
DB_USER="dispatch"

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$PG_PASS' CREATEDB;"

# Şifreyi güncelle ve yetkilendir
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$PG_PASS';" 2>/dev/null || true

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# 5. Backend Bağımlılıkları ve Migrasyonlar
echo -e "\n▶ 5. Backend derleniyor ve optimize ediliyor..."
cd "$DISPATCH_DIR/backend"

# .env yapılandırması (Otomatik Şifre & Güvenlik Güvencesi)
cat << ENVEOF > "$DISPATCH_DIR/backend/.env"
DATABASE_URL=postgresql://$DB_USER:$PG_PASS@localhost:5432/$DB_NAME
REDIS_URL=redis://localhost:6379
SECRET_KEY_BASE=dispatch_prod_master_secret_key_$(openssl rand -hex 32)
SERVER_IPV4=$SERVER_IP
RAILS_ENV=production
RAILS_MAX_THREADS=5
WEB_CONCURRENCY=1
MALLOC_ARENA_MAX=2
ENVEOF
chmod 600 "$DISPATCH_DIR/backend/.env"

bundle install --quiet || bundle install
bin/rails db:migrate RAILS_ENV=production

# 6. Frontend Arayüzünü Derle
echo -e "\n▶ 6. Frontend arayüzü derleniyor..."
cd "$DISPATCH_DIR/frontend"
npm install --silent || npm install
npm run build

# 7. Nginx Ters Vekilini Yapılandır (Port 80 -> Frontend ve Rails API)
echo -e "\n▶ 7. Nginx web sunucusu yapılandırılıyor..."
cat << NGINXEOF > /etc/nginx/sites-available/dispatch
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root $DISPATCH_DIR/frontend/dist;
    index index.html;

    # API Proxy
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # SPA Routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXEOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/dispatch /etc/nginx/sites-enabled/dispatch
nginx -t && systemctl reload nginx

# 8. Systemd Servislerini Kur ve Başlat
echo -e "▶ 8. Dispatch servisleri başlatılıyor..."
cat << SVCEOF > /etc/systemd/system/dispatch-backend.service
[Unit]
Description=Dispatch Rails Backend Server
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=$DISPATCH_DIR/backend
EnvironmentFile=$DISPATCH_DIR/backend/.env
Environment=RAILS_ENV=production
ExecStart=/usr/bin/bundle exec rails server -b 0.0.0.0 -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable --now dispatch-backend
systemctl restart dispatch-backend

# Kurulum Tamamlandı Banner
echo -e "\n\033[32m=============================================================\033[0m"
echo -e "\033[32m✔ DISPATCH BAŞARIYLA BAŞLATILDI!\033[0m"
echo -e "\033[32m=============================================================\033[0m\n"
echo -e "Şimdi bilgisayarınızdan veya telefonunuzdan şu adrese gidin:"
echo -e "👉 \033[1;33mhttp://$SERVER_IP/setup\033[0m  (veya \033[33mhttp://$SERVER_IP:3000/setup\033[0m)\n"
echo -e "Açılan web ekranında:"
echo -e "  1. Alan adınızı (örn: \033[36mnoirlang.tr\033[0m) girin"
echo -e "  2. Yönetici hesabınızı belirleyin"
echo -e "  3. Cloudflare API Token'ı yapıştırıp tek tıkla kurun!\n"
echo -e "\033[32m=============================================================\033[0m\n"
