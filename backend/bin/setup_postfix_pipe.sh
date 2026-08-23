#!/usr/bin/env bash
set -e

echo "▶ Postfix e-posta içe aktarım motoru bağlanıyor..."

# 1. Inbound receiver'a çalıştırma izni ver
chmod +x /root/dispatch/backend/bin/dispatch_inbound_receiver 2>/dev/null || chmod +x "$(pwd)/backend/bin/dispatch_inbound_receiver" 2>/dev/null || true

# 2. Inbound pipe scriptini oluştur
printf '#!/usr/bin/env bash\nexec /bin/bash -lc "cd /root/dispatch/backend && RAILS_ENV=production bundle exec bin/dispatch_inbound_receiver"\n' > /usr/local/bin/dispatch-inbound-pipe
chmod +x /usr/local/bin/dispatch-inbound-pipe

# 3. Postfix master.cf içine dispatch-pipe ekle
if ! grep -q "dispatch-pipe" /etc/postfix/master.cf 2>/dev/null; then
  printf "\ndispatch-pipe unix - n n - - pipe\n  flags=R user=root argv=/usr/local/bin/dispatch-inbound-pipe\n" >> /etc/postfix/master.cf
fi

# 4. Postfix ayarlarını bağla
postconf -e "myhostname = mail.noirlang.tr" 2>/dev/null || true
postconf -e "mydomain = noirlang.tr" 2>/dev/null || true
postconf -e "myorigin = \$mydomain" 2>/dev/null || true
postconf -e "mydestination = \$myhostname, \$mydomain, localhost.\$mydomain, localhost" 2>/dev/null || true
postconf -e "mailbox_transport = dispatch-pipe" 2>/dev/null || true
postconf -e "fallback_transport = dispatch-pipe" 2>/dev/null || true
postconf -e "local_recipient_maps =" 2>/dev/null || true
postconf -e "inet_interfaces = all" 2>/dev/null || true
postconf -e "inet_protocols = all" 2>/dev/null || true

# 5. Frontend güncel derlemesini /var/www/dispatch'e aktar
if [ -d "/root/dispatch/frontend/dist" ]; then
  mkdir -p /var/www/dispatch
  cp -r /root/dispatch/frontend/dist/* /var/www/dispatch/
  chown -R www-data:www-data /var/www/dispatch 2>/dev/null || true
  chmod -R 755 /var/www/dispatch 2>/dev/null || true
fi

# 6. Servisleri yeniden başlat
systemctl daemon-reload 2>/dev/null || true
systemctl restart postfix dispatch-backend dispatch-sidekiq nginx 2>/dev/null || true

echo "✔ Postfix içe aktarım motoru başarıyla aktif edildi!"
