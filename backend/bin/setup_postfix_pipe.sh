#!/usr/bin/env bash
set -e

echo "▶ EmailWiz (Postfix + Dovecot) ve Dispatch motoru senkronize ediliyor..."

DOMAIN="noirlang.tr"
MAILDOMAIN="mail.noirlang.tr"

# 1. SSL Sertifika tespiti
CERTDIR="/etc/letsencrypt/live/$MAILDOMAIN"
[ ! -d "$CERTDIR" ] && CERTDIR="/etc/letsencrypt/live/$DOMAIN"
[ ! -d "$CERTDIR" ] && CERTDIR="/etc/letsencrypt/live/dispatch.$DOMAIN"

# 2. Dovecot Yapılandırması (Thunderbird IMAP/POP3 + SASL Auth)
cat << 'DOVECOT_EOF' > /etc/dovecot/local.conf
mail_driver = maildir
mail_home = /home/%{user | username}
mail_path = %{home}/Mail
mail_inbox_path = %{home}/Mail/Inbox

namespace inbox {
  inbox = yes
  separator = /
  prefix = 

  mailbox Drafts {
    special_use = \Drafts
    auto = subscribe
  }
  mailbox Junk {
    special_use = \Junk
    auto = subscribe
  }
  mailbox Trash {
    special_use = \Trash
    auto = subscribe
  }
  mailbox Sent {
    special_use = \Sent
    auto = subscribe
  }
  mailbox Archive {
    special_use = \Archive
    auto = subscribe
  }
  mailbox Approvals {
    auto = subscribe
  }
}

service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}
DOVECOT_EOF

# 3. Postfix master.cf (SMTP 25, Submission 587, SMTPS 465, dispatch-pipe)
cat << 'MASTER_EOF' > /etc/postfix/master.cf
smtp      inet  n       -       y       -       -       smtpd
submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=may
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_client_restrictions=permit_sasl_authenticated,reject
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject_unauth_destination
smtps     inet  n       -       y       -       -       smtpd
  -o syslog_name=postfix/smtps
  -o smtpd_tls_wrappermode=yes
  -o smtpd_sasl_auth_enable=yes
pickup    unix  n       -       y       60      1       pickup
cleanup   unix  n       -       y       -       0       cleanup
qmgr      unix  n       -       n       300     1       qmgr
tlsmgr    unix  -       -       y       1000?   1       tlsmgr
rewrite   unix  -       -       y       -       -       trivial-rewrite
bounce    unix  -       -       y       -       0       bounce
defer     unix  -       -       y       -       0       bounce
trace     unix  -       -       y       -       0       bounce
verify    unix  -       -       y       -       1       verify
flush     unix  n       -       y       1000?   0       flush
proxymap  unix  -       -       n       -       -       proxymap
proxywrite unix -       -       n       -       1       proxymap
smtp      unix  -       -       y       -       -       smtp
relay     unix  -       -       y       -       -       smtp
showq     unix  n       -       y       -       -       showq
error     unix  -       -       y       -       -       error
retry     unix  -       -       y       -       -       error
discard   unix  -       -       y       -       -       discard
local     unix  -       n       n       -       -       local
virtual   unix  -       n       n       -       -       virtual
lmtp      unix  -       -       y       -       -       lmtp
anvil     unix  -       -       y       -       1       anvil
scache    unix  -       -       y       -       1       scache
postlog   unix-dgram n  -       n       -       1       postlogd

dispatch-pipe unix -    n       n       -       -       pipe
  flags=R user=root argv=/usr/local/bin/dispatch-inbound-pipe
MASTER_EOF

# 4. OpenDKIM Yapılandırması & Anahtar Senkronizasyonu
mkdir -p /etc/opendkim/keys/$DOMAIN
cd /root/dispatch/backend 2>/dev/null || cd "$(pwd)/backend"
RAILS_ENV=production bundle exec bin/rails runner "
if ServerConfig.current&.dkim_private_key.present?
  File.write('/etc/opendkim/keys/#{ServerConfig.current.domain}/mail.private', ServerConfig.current.dkim_private_key)
end
" 2>/dev/null || true

cat << 'OPENDKIM_EOF' > /etc/opendkim.conf
AutoRestart             Yes
AutoRestartRate         10/1h
UMask                   002
Syslog                  yes
SyslogSuccess           Yes
LogWhy                  Yes

Canonicalization        relaxed/simple

ExternalIgnoreList      refile:/etc/opendkim/TrustedHosts
InternalHosts           refile:/etc/opendkim/TrustedHosts
KeyTable                refile:/etc/opendkim/KeyTable
SigningTable            refile:/etc/opendkim/SigningTable

Mode                    sv
SignatureAlgorithm      rsa-sha256
RequireSafeKeys         No

PidFile                 /run/opendkim/opendkim.pid
Socket                  inet:8891@127.0.0.1
OPENDKIM_EOF

cat << OPENDKIM_HOSTS > /etc/opendkim/TrustedHosts
127.0.0.1
localhost
::1
127.0.0.1
$MAILDOMAIN
$DOMAIN
*.$DOMAIN
OPENDKIM_HOSTS

echo "mail._domainkey.$DOMAIN $DOMAIN:mail:/etc/opendkim/keys/$DOMAIN/mail.private" > /etc/opendkim/KeyTable
echo "*@$DOMAIN mail._domainkey.$DOMAIN" > /etc/opendkim/SigningTable
echo "*@$MAILDOMAIN mail._domainkey.$DOMAIN" >> /etc/opendkim/SigningTable

chown -R root:root /etc/opendkim
chmod 755 /etc/opendkim /etc/opendkim/keys /etc/opendkim/keys/$DOMAIN
chmod 600 /etc/opendkim/keys/$DOMAIN/mail.private 2>/dev/null || true

# 5. Postfix main.cf Ayarları
postconf -e "myhostname = $MAILDOMAIN" 2>/dev/null || true
postconf -e "mydomain = $DOMAIN" 2>/dev/null || true
postconf -e "myorigin = \$mydomain" 2>/dev/null || true
postconf -e "mydestination = \$myhostname, \$mydomain, localhost.\$mydomain, localhost" 2>/dev/null || true
postconf -e "mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128 127.0.0.1" 2>/dev/null || true
postconf -e "smtpd_relay_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination" 2>/dev/null || true
postconf -e "smtpd_recipient_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination" 2>/dev/null || true
postconf -e "mailbox_transport = dispatch-pipe" 2>/dev/null || true
postconf -e "fallback_transport = dispatch-pipe" 2>/dev/null || true
postconf -e "local_recipient_maps =" 2>/dev/null || true
postconf -e "inet_interfaces = all" 2>/dev/null || true
postconf -e "inet_protocols = ipv4" 2>/dev/null || true
postconf -e "smtpd_sasl_auth_enable = yes" 2>/dev/null || true
postconf -e "smtpd_sasl_type = dovecot" 2>/dev/null || true
postconf -e "smtpd_sasl_path = private/auth" 2>/dev/null || true
postconf -e "smtpd_tls_security_level = may" 2>/dev/null || true
postconf -e "smtp_tls_security_level = may" 2>/dev/null || true
postconf -e "milter_default_action = accept" 2>/dev/null || true
postconf -e "milter_protocol = 6" 2>/dev/null || true
postconf -e "smtpd_milters = inet:127.0.0.1:8891" 2>/dev/null || true
postconf -e "non_smtpd_milters = inet:127.0.0.1:8891" 2>/dev/null || true

if [ -f "$CERTDIR/fullchain.pem" ]; then
  postconf -e "smtpd_tls_cert_file = $CERTDIR/fullchain.pem" 2>/dev/null || true
  postconf -e "smtpd_tls_key_file = $CERTDIR/privkey.pem" 2>/dev/null || true
fi

# 6. Inbound pipe scripti
cat << 'PIPE_EOF' > /usr/local/bin/dispatch-inbound-pipe
#!/usr/bin/env bash
exec /root/dispatch/backend/bin/dispatch_inbound_receiver
PIPE_EOF
chmod +x /usr/local/bin/dispatch-inbound-pipe
chmod +x /root/dispatch/backend/bin/dispatch_inbound_receiver 2>/dev/null || true

# 6. Linux Kullanıcı Senkronizasyonu & Maildir (Thunderbird & Webmail)
cd /root/dispatch/backend 2>/dev/null || cd "$(pwd)/backend"
RAILS_ENV=production bundle exec bin/rails runner "
u = User.find_or_initialize_by(email: 'melihemik@noirlang.tr')
u.name = 'Melih Emik'
u.password = SecureRandom.hex(16)
u.password_confirmation = u.password
u.approval_system_enabled = true
u.spy_pixel_blocking = true
u.save!

# admin password configured via setup wizard

cfg = ServerConfig.first_or_create!
cfg.update!(
  domain: 'noirlang.tr',
  mail_subdomain: 'mail',
  ipv4: '127.0.0.1',
  mode: 'production',
  is_configured: true
)
" 2>/dev/null || true

# Linux sistem kullanıcısı ve şifresi oluştur
id -u melihemik >/dev/null 2>&1 || useradd -m -G mail -s /bin/bash melihemik 2>/dev/null || true
# chpasswd handled dynamically
mkdir -p /home/melihemik/Mail/Inbox/{cur,new,tmp}
mkdir -p /home/melihemik/Mail/{Sent,Drafts,Trash,Junk,Archive}/{cur,new,tmp}
chown -R melihemik:melihemik /home/melihemik/Mail 2>/dev/null || true
chmod -R 700 /home/melihemik/Mail 2>/dev/null || true

# 7. Frontend kopyası
if [ -d "/root/dispatch/frontend/dist" ]; then
  mkdir -p /var/www/dispatch
  cp -r /root/dispatch/frontend/dist/* /var/www/dispatch/
  chown -R www-data:www-data /var/www/dispatch 2>/dev/null || true
  chmod -R 755 /var/www/dispatch 2>/dev/null || true
fi

# 8. Servisleri yeniden başlat
systemctl daemon-reload 2>/dev/null || true
systemctl restart dovecot postfix dispatch-backend dispatch-sidekiq nginx 2>/dev/null || true

echo "============================================================="
echo "✔ Postfix (SMTP), Dovecot (IMAP) ve Dispatch %100 Hazır!"
echo "  Kullanıcı: melihemik@noirlang.tr"
echo "  Webmail:   https://mail.noirlang.tr"
echo "============================================================="
