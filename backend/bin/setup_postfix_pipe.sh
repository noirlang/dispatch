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
postconf -e "mailbox_transport = dispatch-pipe" 2>/dev/null || true
postconf -e "fallback_transport = dispatch-pipe" 2>/dev/null || true
postconf -e "local_recipient_maps =" 2>/dev/null || true
postconf -e "inet_interfaces = all" 2>/dev/null || true
postconf -e "inet_protocols = all" 2>/dev/null || true

# 5. Servisleri yeniden başlat
systemctl restart postfix dispatch-backend dispatch-sidekiq 2>/dev/null || true

echo "✔ Postfix içe aktarım motoru başarıyla aktif edildi!"
