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
cat << DOVECOT_EOF > /etc/dovecot/dovecot.conf
protocols = imap pop3 lmtp
listen = *

ssl = yes
$( [ -f "$CERTDIR/fullchain.pem" ] && echo "ssl_cert = <$CERTDIR/fullchain.pem" )
$( [ -f "$CERTDIR/privkey.pem" ] && echo "ssl_key = <$CERTDIR/privkey.pem" )

auth_mechanisms = plain login
auth_username_format = %n

userdb {
  driver = passwd
}
passdb {
  driver = pam
}

mail_location = maildir:~/Mail:INBOX=~/Mail/Inbox:LAYOUT=fs

namespace inbox {
  inbox = yes
  mailbox Drafts {
    special_use = \\Drafts
    auto = subscribe
  }
  mailbox Junk {
    special_use = \\Junk
    auto = subscribe
  }
  mailbox Sent {
    special_use = \\Sent
    auto = subscribe
  }
  mailbox Trash {
    special_use = \\Trash
    auto = subscribe
  }
  mailbox Archive {
    special_use = \\Archive
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

# 4. Postfix main.cf Ayarları
postconf -e "myhostname = $MAILDOMAIN" 2>/dev/null || true
postconf -e "mydomain = $DOMAIN" 2>/dev/null || true
postconf -e "myorigin = \$mydomain" 2>/dev/null || true
postconf -e "mydestination = \$myhostname, \$mydomain, localhost.\$mydomain, localhost" 2>/dev/null || true
postconf -e "mailbox_transport = dispatch-pipe" 2>/dev/null || true
postconf -e "fallback_transport = dispatch-pipe" 2>/dev/null || true
postconf -e "local_recipient_maps =" 2>/dev/null || true
postconf -e "inet_interfaces = all" 2>/dev/null || true
postconf -e "inet_protocols = all" 2>/dev/null || true
postconf -e "smtpd_sasl_auth_enable = yes" 2>/dev/null || true
postconf -e "smtpd_sasl_type = dovecot" 2>/dev/null || true
postconf -e "smtpd_sasl_path = private/auth" 2>/dev/null || true
postconf -e "smtpd_tls_security_level = may" 2>/dev/null || true
postconf -e "smtp_tls_security_level = may" 2>/dev/null || true

if [ -f "$CERTDIR/fullchain.pem" ]; then
  postconf -e "smtpd_tls_cert_file = $CERTDIR/fullchain.pem" 2>/dev/null || true
  postconf -e "smtpd_tls_key_file = $CERTDIR/privkey.pem" 2>/dev/null || true
fi

# 5. Inbound pipe scripti
cat << 'PIPE_EOF' > /usr/local/bin/dispatch-inbound-pipe
#!/usr/bin/env bash
exec /root/dispatch/backend/bin/dispatch_inbound_receiver
PIPE_EOF
chmod +x /usr/local/bin/dispatch-inbound-pipe
chmod +x /root/dispatch/backend/bin/dispatch_inbound_receiver 2>/dev/null || true

# 6. Linux Kullanıcı Senkronizasyonu (Thunderbird için)
cd /root/dispatch/backend 2>/dev/null || cd "$(pwd)/backend"
RAILS_ENV=production bundle exec bin/rails runner "
User.find_each do |u|
  uname = u.email.split('@').first
  next if uname.blank?
  system('useradd', '-m', '-G', 'mail', '-s', '/usr/sbin/nologin', uname, out: File::NULL, err: File::NULL) unless system('id', '-u', uname, out: File::NULL, err: File::NULL)
end
" 2>/dev/null || true

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

echo "====================================================="
echo "✔ Postfix, Dovecot (Thunderbird IMAP/SMTP) ve Dispatch senkronize edildi!"
echo "====================================================="
