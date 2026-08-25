#!/usr/bin/env bash
set -e

echo "▶ Dispatch güncelleniyor..."

# Çalışma dizinine geç
if [ -d "/root/dispatch" ]; then
  cd /root/dispatch
else
  cd "$(dirname "$0")"
fi

# 1. En son master commit'lerini çek ve eşitle
echo "▶ Git güncellemeleri çekiliyor..."
git fetch origin master
git reset --hard origin/master

# 2. Frontend derlemesi ve web dizinine kopyalama
echo "▶ Frontend derleniyor..."
cd frontend
npm install
npm run build
mkdir -p /var/www/dispatch
cp -r dist/* /var/www/dispatch/
chown -R www-data:www-data /var/www/dispatch 2>/dev/null || true
chmod -R 755 /var/www/dispatch 2>/dev/null || true

# 3. Backend bağımlılıkları & Migration
echo "▶ Backend güncelleniyor..."
cd ../backend
bundle install
RAILS_ENV=production bundle exec bin/rails db:migrate 2>/dev/null || true

# 4. Servisleri yeniden başlat
echo "▶ Servisler yeniden başlatılıyor..."
systemctl daemon-reload 2>/dev/null || true
systemctl restart dispatch-backend dispatch-sidekiq nginx 2>/dev/null || true

echo "============================================================="
echo "✔ Dispatch başarıyla en son sürüme güncellendi!"
echo "============================================================="
