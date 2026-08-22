#!/bin/sh

# BEFORE INSTALLING

# Have a Debian or Ubuntu server with a static IP and DNS records (usually
# A/AAAA) that point your domain name to it.

# NOTE WHILE INSTALLING

# On installation of Postfix, select "Internet Site" and put in TLD (without
# `mail.` before it).

# AFTER INSTALLING

# More DNS records will be given to you to install. One of them will be
# different for every installation and is uniquely generated on your machine.

umask 0022

install_packages="postfix postfix-pcre dovecot-imapd dovecot-pop3d dovecot-sieve opendkim opendkim-tools spamassassin spamc net-tools fail2ban bind9-host"

systemctl -q stop dovecot
systemctl -q stop postfix
apt-get purge ?config-files -y $install_packages
apt-get install -y $install_packages

domain="$(cat /etc/mailname)"
subdom=${MAIL_SUBDOM:-mail}
maildomain="$subdom.$domain"
certdir="/etc/letsencrypt/live/$maildomain"

selfsigned="no" # yes no
allow_suboptimal_ciphers="yes" #yes no
mailbox_format="maildir" # maildir sdbox
allowed_protocols=" imap pop3 "  #imap pop3

use_cert_config="no"
country_name="" # IT US UK IN etc etc
state_or_province_name=""
organization_name=""
common_name="$( hostname -f )"

if [ "$use_cert_config" = "yes" ]; then
	echo "[req]
	default_bit = 4096
	distinguished_name = req_distinguished_name
	prompt = no

	[req_distinguished_name]
	countryName             = $country_name
	stateOrProvinceName     = $state_or_province_name
	organizationName        = $organization_name
	commonName              = $common_name " > $certdir/certconfig.conf

fi

# Detect Server's True Public IPv4 (Compatible with Cloudflare Pages & Subdomains)
detected_ipv4=$(curl -s -m 5 https://api.ipify.org 2>/dev/null || curl -s -m 5 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
ipv4="${SERVER_IPV4:-$detected_ipv4}"
[ -z "$ipv4" ] && ipv4=$(host "$maildomain" 2>/dev/null | grep -m1 -Eo '([0-9]+\.){3}[0-9]+')
[ -z "$ipv4" ] && ipv4=$(host "$domain" 2>/dev/null | grep -m1 -Eo '([0-9]+\.){3}[0-9]+')
[ -z "$ipv4" ] && ipv4="127.0.0.1"

ipv6=$(host "$domain" 2>/dev/null | grep "IPv6" | awk '{print $NF}')

# Open required mail ports
for port in 80 993 465 25 587 110 995; do
	ufw allow "$port" 2>/dev/null
done

if [ "$selfsigned" = "yes" ]; then
	rm -f $certdir/privkey.pem
	rm -f $certdir/csr.pem
	rm -f $certdir/fullchain.pem

	echo "Generating a 4096 rsa key and a self-signed certificate that lasts 100 years"
	mkdir -p $certdir
	openssl genrsa -out $certdir/privkey.pem 4096

	if [ "$use_cert_config" = "yes" ]; then
		openssl req -new -key $certdir/privkey.pem -out $certdir/csr.pem -config $certdir/certconfig.conf
	else
		openssl req -new -key $certdir/privkey.pem -out $certdir/csr.pem
	fi
	openssl req -x509 -days 36500 -key $certdir/privkey.pem -in $certdir/csr.pem -out $certdir/fullchain.pem
else

	# Open port 80 for Certbot.
	ufw allow 80 2>/dev/null

	[ ! -d "$certdir" ] &&
		possiblecert="$(certbot certificates 2>/dev/null | grep "Domains:\.* \(\*\.$domain\|$maildomain\)\(\s\|$\)" -A 2 | awk '/Certificate Path/ {print $3}' | head -n1)" &&
		certdir="${possiblecert%/*}"

	[ ! -d "$certdir" ] &&
		certdir="/etc/letsencrypt/live/$maildomain" &&
		case "$(netstat -tulpn | grep ":80\s")" in
		*nginx*)
			apt install -y python3-certbot-nginx
			certbot -d "$maildomain" certonly --nginx --register-unsafely-without-email --agree-tos
			;;
		*apache*)
			apt install -y python3-certbot-apache
			certbot -d "$maildomain" certonly --apache --register-unsafely-without-email --agree-tos
			;;
		*)
			apt install -y python3-certbot
			certbot -d "$maildomain" certonly --standalone --register-unsafely-without-email --agree-tos
			;;
	esac

fi

[ ! -f "$certdir/fullchain.pem" ] && echo "Error locating or installing SSL certificate." && exit 1
[ ! -f "$certdir/privkey.pem" ] && echo "Error locating or installing SSL certificate." && exit 1
if [ "$selfsigned" != "yes" ]; then
	[ ! -f "$certdir/cert.pem" ] && echo "Error locating or installing SSL certificate." && exit 1
fi

[ ! -d "$certdir" ] && echo "Error locating or installing SSL certificate." && exit 1

echo "Configuring Postfix's main.cf..."

# Adding additional vars to fix an issue with receiving emails (relay access denied) and adding it to mydestination.
postconf -e "myhostname = $maildomain"
postconf -e "mail_name = $domain"  #This is for the smtpd_banner
postconf -e "mydomain = $domain"
postconf -e 'mydestination = $myhostname, $mydomain, mail, localhost.localdomain, localhost, localhost.$mydomain'

# Change the cert/key files to the default locations of the Let's Encrypt cert/key
postconf -e "smtpd_tls_key_file=$certdir/privkey.pem"
postconf -e "smtpd_tls_cert_file=$certdir/fullchain.pem"
if [ "$selfsigned" != "yes" ]; then
	postconf -e "smtp_tls_CAfile=$certdir/cert.pem"
fi

# Enable, but do not require TLS. Requiring it with other servers would cause
# mail delivery problems and requiring it locally would cause many other
# issues.
postconf -e 'smtpd_tls_security_level = may'
postconf -e 'smtp_tls_security_level = may'

# TLS required for authentication.
postconf -e 'smtpd_tls_auth_only = yes'

# Exclude insecure and obsolete encryption protocols.
postconf -e 'smtpd_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1'
postconf -e 'smtp_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1'
postconf -e 'smtpd_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1'
postconf -e 'smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1'

# Exclude suboptimal ciphers.
if [ "$allow_suboptimal_ciphers" = "no" ]; then
	postconf -e 'tls_preempt_cipherlist = yes'
	postconf -e 'smtpd_tls_exclude_ciphers = aNULL, LOW, EXP, MEDIUM, ADH, AECDH, MD5, DSS, ECDSA, CAMELLIA128, 3DES, CAMELLIA256, RSA+AES, eNULL'
fi

# Here we tell Postfix to look to Dovecot for authenticating users/passwords.
# Dovecot will be putting an authentication socket in /var/spool/postfix/private/auth
postconf -e 'smtpd_sasl_auth_enable = yes'
postconf -e 'smtpd_sasl_type = dovecot'
postconf -e 'smtpd_sasl_path = private/auth'

# helo, sender, relay and recipient restrictions
postconf -e "smtpd_sender_login_maps = pcre:/etc/postfix/login_maps.pcre"
postconf -e 'smtpd_sender_restrictions = reject_sender_login_mismatch, permit_sasl_authenticated, permit_mynetworks, reject_unknown_reverse_client_hostname, reject_unknown_sender_domain'
postconf -e 'smtpd_recipient_restrictions = permit_sasl_authenticated, permit_mynetworks, reject_unauth_destination, reject_unknown_recipient_domain'
postconf -e 'smtpd_relay_restrictions = permit_sasl_authenticated, reject_unauth_destination'
postconf -e 'smtpd_helo_required = yes'
postconf -e 'smtpd_helo_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_invalid_helo_hostname, reject_non_fqdn_helo_hostname, reject_unknown_helo_hostname'

# NOTE: the trailing slash here, or for any directory name in the home_mailbox
# command, is necessary as it distinguishes a maildir (which is the actual
# directory that we want) from a spoolfile (which is what old unix boomers want
# and no one else).
postconf -e 'home_mailbox = Mail/Inbox/'

# Prevent "Received From:" header in sent emails in order to prevent leakage of public ip addresses
postconf -e "header_checks = regexp:/etc/postfix/header_checks"

# strips "Received From:" in sent emails
echo "/^Received:.*/     IGNORE
/^X-Originating-IP:/    IGNORE" >> /etc/postfix/header_checks

# Create a login map file that ensures that if a sender wants to send a mail from a user at our local
# domain, they must be authenticated as that user
echo "/^(.*)@$(sh -c "echo $domain | sed 's/\./\\\./'")$/   \${1}" > /etc/postfix/login_maps.pcre

# master.cf
echo "Configuring Postfix's master.cf..."

sed -i '/^\s*-o/d;/^\s*submission/d;/^\s*smtp/d' /etc/postfix/master.cf

echo "smtp unix - - n - - smtp
smtp inet n - y - - smtpd
  -o content_filter=spamassassin
submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_tls_auth_only=yes
  -o smtpd_enforce_tls=yes
  -o smtpd_client_restrictions=permit_sasl_authenticated,reject
  -o smtpd_sender_restrictions=reject_sender_login_mismatch
  -o smtpd_sender_login_maps=pcre:/etc/postfix/login_maps.pcre
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject_unauth_destination
smtps     inet  n       -       y       -       -       smtpd
  -o syslog_name=postfix/smtps
  -o smtpd_tls_wrappermode=yes
  -o smtpd_sasl_auth_enable=yes
spamassassin unix -     n       n       -       -       pipe
  user=debian-spamd argv=/usr/bin/spamc -f -e /usr/sbin/sendmail -oi -f \${sender} \${recipient}" >> /etc/postfix/master.cf

# By default, dovecot has a bunch of configs in /etc/dovecot/conf.d/ These
# files have nice documentation if you want to read it, but it's a huge pain to
# go through them to organize.  Instead, we simply overwrite
# /etc/dovecot/dovecot.conf because it's easier to manage. You can get a backup
# of the original in /usr/share/dovecot if you want.
mv /etc/dovecot/dovecot.conf /etc/dovecot/dovecot.backup.conf

echo "Creating Dovecot config..."

echo "# Dovecot config
# Note that in the dovecot conf, you can use:
# %u for username
# %n for the name in name@domain.tld
# %d for the domain
# %h the user's home directory

ssl = required
ssl_cert = <$certdir/fullchain.pem
ssl_key = <$certdir/privkey.pem
ssl_min_protocol = TLSv1.2
ssl_cipher_list = "'EECDH+ECDSA+AESGCM:EECDH+aRSA+AESGCM:EECDH+ECDSA+SHA256:EECDH+aRSA+SHA256:EECDH+ECDSA+SHA384:EECDH+ECDSA+SHA256:EECDH+aRSA+SHA384:EDH+aRSA+AESGCM:EDH+aRSA+SHA256:EDH+aRSA:EECDH:!aNULL:!eNULL:!MEDIUM:!LOW:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS:!RC4:!SEED'"
ssl_prefer_server_ciphers = yes
ssl_dh = </usr/share/dovecot/dh.pem
auth_mechanisms = plain login
auth_username_format = %n

protocols = \$protocols $allowed_protocols

# Search for valid users in /etc/passwd
userdb {
	driver = passwd
}
#Fallback: Use plain old PAM to find user passwords
passdb {
	driver = pam
}

# Our mail for each user will be in ~/Mail, and the inbox will be ~/Mail/Inbox
# The LAYOUT option is also important because otherwise, the boxes will be \`.Sent\` instead of \`Sent\`.
mail_location = $mailbox_format:~/Mail:INBOX=~/Mail/Inbox:LAYOUT=fs
namespace inbox {
	inbox = yes
	mailbox Drafts {
	special_use = \\Drafts
	auto = subscribe
}
	mailbox Junk {
	special_use = \\Junk
	auto = subscribe
	autoexpunge = 30d
}
	mailbox Sent {
	special_use = \\Sent
	auto = subscribe
}
	mailbox Trash {
	special_use = \\Trash
}
	mailbox Archive {
	special_use = \\Archive
}
}

# Here we let Postfix use Dovecot's authentication system.
service auth {
  unix_listener /var/spool/postfix/private/auth {
	mode = 0660
	user = postfix
	group = postfix
}
}

protocol lda {
  mail_plugins = \$mail_plugins sieve
}

protocol lmtp {
  mail_plugins = \$mail_plugins sieve
}

protocol pop3 {
  pop3_uidl_format = %08Xu%08Xv
  pop3_no_flag_updates = yes
}

plugin {
	sieve = ~/.dovecot.sieve
	sieve_default = /var/lib/dovecot/sieve/default.sieve
	#sieve_global_path = /var/lib/dovecot/sieve/default.sieve
	sieve_dir = ~/.sieve
	sieve_global_dir = /var/lib/dovecot/sieve/
}
" > /etc/dovecot/dovecot.conf

# If using an old version of Dovecot, remove the ssl_dl line.
case "$(dovecot --version)" in
	1|2.1*|2.2*) sed -i '/^ssl_dh/d' /etc/dovecot/dovecot.conf ;;
esac

mkdir /var/lib/dovecot/sieve/

echo "require [\"fileinto\", \"mailbox\"];
if header :contains \"X-Spam-Flag\" \"YES\"
	{
		fileinto \"Junk\";
	}" > /var/lib/dovecot/sieve/default.sieve

grep -q '^vmail:' /etc/passwd || useradd vmail
chown -R vmail:vmail /var/lib/dovecot
sievec /var/lib/dovecot/sieve/default.sieve

echo 'Preparing user authentication...'
grep -q nullok /etc/pam.d/dovecot ||
echo 'auth    required        pam_unix.so nullok
account required        pam_unix.so' >> /etc/pam.d/dovecot

# OpenDKIM

# A lot of the big name email services, like Google, will automatically reject
# as spam unfamiliar and unauthenticated email addresses. As in, the server
# will flatly reject the email, not even delivering it to someone's Spam
# folder.

# OpenDKIM is a way to authenticate your email so you can send to such services
# without a problem.

# Create an OpenDKIM key in the proper place with proper permissions.
echo 'Generating OpenDKIM keys...'
mkdir -p "/etc/postfix/dkim/$domain"
opendkim-genkey -D "/etc/postfix/dkim/$domain" -d "$domain" -s "$subdom"
chgrp -R opendkim /etc/postfix/dkim/*
chmod -R g+r /etc/postfix/dkim/*

# Generate the OpenDKIM info:
echo 'Configuring OpenDKIM...'
grep -q "$domain" /etc/postfix/dkim/keytable 2>/dev/null ||
echo "$subdom._domainkey.$domain $domain:$subdom:/etc/postfix/dkim/$domain/$subdom.private" >> /etc/postfix/dkim/keytable

grep -q "$domain" /etc/postfix/dkim/signingtable 2>/dev/null ||
echo "*@$domain $subdom._domainkey.$domain" >> /etc/postfix/dkim/signingtable

grep -q '127.0.0.1' /etc/postfix/dkim/trustedhosts 2>/dev/null ||
	echo '127.0.0.1
10.1.0.0/16' >> /etc/postfix/dkim/trustedhosts

# ...and source it from opendkim.conf
grep -q '^KeyTable' /etc/opendkim.conf 2>/dev/null || echo 'KeyTable file:/etc/postfix/dkim/keytable
SigningTable refile:/etc/postfix/dkim/signingtable
InternalHosts refile:/etc/postfix/dkim/trustedhosts' >> /etc/opendkim.conf

sed -i '/^#Canonicalization/s/simple/relaxed\/simple/' /etc/opendkim.conf
sed -i '/^#Canonicalization/s/^#//' /etc/opendkim.conf

sed -i '/Socket/s/^#*/#/' /etc/opendkim.conf
grep -q '^Socket\s*inet:12301@localhost' /etc/opendkim.conf || echo 'Socket inet:12301@localhost' >> /etc/opendkim.conf

# OpenDKIM daemon settings, removing previously activated socket.
sed -i '/^SOCKET/d' /etc/default/opendkim && echo "SOCKET=\"inet:12301@localhost\"" >> /etc/default/opendkim

# Here we add to postconf the needed settings for working with OpenDKIM
echo 'Configuring Postfix with OpenDKIM settings...'
postconf -e 'smtpd_sasl_security_options = noanonymous, noplaintext'
postconf -e 'smtpd_sasl_tls_security_options = noanonymous'
postconf -e "myhostname = $maildomain"
postconf -e 'milter_default_action = accept'
postconf -e 'milter_protocol = 6'
postconf -e 'smtpd_milters = inet:localhost:12301'
postconf -e 'non_smtpd_milters = inet:localhost:12301'
postconf -e 'mailbox_command = /usr/lib/dovecot/deliver'

# Long-term fix to prevent SMTP smuggling
postconf -e 'smtpd_forbid_bare_newline = normalize'
postconf -e 'smtpd_forbid_bare_newline_exclusions = $mynetworks'

# A fix for "Opendkim won't start: can't open PID file?", as specified here: https://serverfault.com/a/847442
/lib/opendkim/opendkim.service.generate
systemctl daemon-reload

# Enable fail2ban security for dovecot and postfix.
[ ! -f /etc/fail2ban/jail.d/emailwiz.local ] && echo "[postfix]
enabled = true
[postfix-sasl]
enabled = true
[sieve]
enabled = true
[dovecot]
enabled = true" > /etc/fail2ban/jail.d/emailwiz.local

sed -i "s|^backend = auto$|backend = systemd|" /etc/fail2ban/jail.conf

# Enable SpamAssassin update cronjob.
if [ -f /etc/default/spamassassin ]
then
	sed -i "s|^CRON=0|CRON=1|" /etc/default/spamassassin
	printf "Restarting spamassassin..."
	service spamassassin restart && printf " ...done\\n"
	systemctl enable spamassassin
elif [ -f /etc/default/spamd ]
then
	sed -i "s|^CRON=0|CRON=1|" /etc/default/spamd
	printf "Restarting spamd..."
	service spamd restart && printf " ...done\\n"
	systemctl enable spamd
else
	printf "!!! Neither /etc/default/spamassassin or /etc/default/spamd exists, this is unexpected and needs to be investigated"
fi

for x in opendkim dovecot postfix fail2ban; do
	printf "Restarting %s..." "$x"
	service "$x" restart && printf " ...done\\n"
	systemctl enable "$x"
done

pval="$(tr -d '\n' <"/etc/postfix/dkim/$domain/$subdom.txt" | sed "s/k=rsa.* \"p=/k=rsa; p=/;s/\"\s*\"//;s/\"\s*).*//" | grep -o 'p=.*')"
dkimentry="$subdom._domainkey.$domain	TXT	v=DKIM1; k=rsa; $pval"
dmarcentry="_dmarc.$domain	TXT	v=DMARC1; p=reject; rua=mailto:postmaster@$domain; fo=1"
spfentry="$domain	TXT	v=spf1 mx a:$maildomain ip4:$ipv4 ip6:$ipv6 -all"
mxentry="$domain	MX	10	$maildomain	300"

useradd -m -G mail postmaster

# Create a cronjob that deletes month-old postmaster mails:
cat <<EOF > /etc/cron.weekly/postmaster-clean
#!/bin/sh

find /home/postmaster/Mail -type f -mtime +30 -name '*.mail*' -delete >/dev/null 2>&1
exit 0
EOF
chmod 755 /etc/cron.weekly/postmaster-clean

grep -q '^deploy-hook = echo "$RENEWED_DOMAINS" | grep -q' /etc/letsencrypt/cli.ini ||
	echo "
deploy-hook = echo \"\$RENEWED_DOMAINS\" | grep -q '$maildomain' && service postfix reload && service dovecot reload" >> /etc/letsencrypt/cli.ini

echo "NOTE: Elements in the entries might appear in a different order in your registrar's DNS settings.
$dkimentry
$dmarcentry
$spfentry
$mxentry" > "$HOME/dns_emailwizard"

cat << EOF

Add these records to your DNS settings:
$dkimentry

$dmarcentry

$spfentry

$mxentry

NOTE: You may need to omit the \`.$domain\` portion at the beginning if
inputting them in a registrar's web interface.

Also, these are now saved to ~/dns_emailwizard in case you want them in a file.
EOF

# -------------------------------------------------------------
# Dispatch Admin Panel Configuration (/admin) & Registration Mode
# -------------------------------------------------------------
printf "\n\033[36m=== ⚡ Dispatch Yönetici Paneli & Kayıt Modu Kurulumu ===\033[0m\n"
printf "Dispatch /admin yönetim paneli için bir şifre girin [Varsayılan: rastgele oluşturulsun]: "
read admin_input_pw

if [ -z "$admin_input_pw" ]; then
    admin_pw="$(openssl rand -hex 8)"
else
    admin_pw="$admin_input_pw"
fi

printf "\nKullanıcı Kayıt Erişim Modunu Seçin:\n"
printf "  [1] Herkese Açık (Herkes kendi hesabını oluşturabilir)\n"
printf "  [2] Sadece Admin Tarafından (Kayıt kapalıdır, sadece /admin panelinden hesap açılır)\n"
printf "  [3] Sadece Davet Koduyla (Yalnızca adminin ürettiği davet koduyla kayıt olunabilir)\n"
printf "Seçiminiz [1/2/3, Varsayılan: 1]: "
read reg_choice

case "$reg_choice" in
    2) reg_mode="admin_only" ;;
    3) reg_mode="invite_only" ;;
    *) reg_mode="public" ;;
esac

# Write environment configuration for backend
dispatch_root="$(cd "$(dirname "$0")/.." 2>/dev/null && pwd)"
if [ -d "$dispatch_root/backend" ]; then
    touch "$dispatch_root/backend/.env"
    grep -v "^ADMIN_PASSWORD=" "$dispatch_root/backend/.env" | grep -v "^REGISTRATION_MODE=" > "$dispatch_root/backend/.env.tmp" 2>/dev/null || true
    echo "ADMIN_PASSWORD=$admin_pw" >> "$dispatch_root/backend/.env.tmp"
    echo "REGISTRATION_MODE=$reg_mode" >> "$dispatch_root/backend/.env.tmp"
    mv "$dispatch_root/backend/.env.tmp" "$dispatch_root/backend/.env"
    
    # Save directly to database config
    (cd "$dispatch_root/backend" && bin/rails runner "SystemConfig.set('registration_mode', '$reg_mode'); SystemConfig.set_admin_password('$admin_pw')" 2>/dev/null) || true
fi

# Setup Nginx Reverse Proxy for Dispatch Webmail
if which nginx >/dev/null 2>&1 || apt-get install -y nginx; then
    # Build frontend assets
    if [ -d "$dispatch_root/frontend" ] && which npm >/dev/null 2>&1; then
        (cd "$dispatch_root/frontend" && npm run build 2>/dev/null) || true
    fi

    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
    cat << EOF > /etc/nginx/sites-available/dispatch
server {
    listen 80;
    server_name dispatch.$domain;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dispatch.$domain;

    ssl_certificate $certdir/fullchain.pem;
    ssl_certificate_key $certdir/privkey.pem;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        root $dispatch_root/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/dispatch /etc/nginx/sites-enabled/dispatch
    nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true
fi

# -------------------------------------------------------------
# Cloudflare Auto-DNS Integration
# -------------------------------------------------------------
printf "\n\033[36m=== ⚡ Cloudflare Otomatik DNS Entegrasyonu ===\033[0m\n"
printf "Cloudflare API Token kullanarak tüm DNS kayıtları otomatik eklensin mi? [e/H]: "
read cf_choice

if [ "$cf_choice" = "e" ] || [ "$cf_choice" = "E" ] || [ "$cf_choice" = "evet" ]; then
    printf "Cloudflare API Token girin: "
    read cf_token

    if [ -n "$cf_token" ]; then
        printf "Cloudflare Zone ID alınıyor...\n"
        zone_id=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$domain&status=active" \
          -H "Authorization: Bearer $cf_token" \
          -H "Content-Type: application/json" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

        if [ -n "$zone_id" ]; then
            printf "\033[32m✔ Zone ID bulundu: $zone_id\033[0m\n"
            printf "DNS kayıtları Cloudflare'a aktarılıyor...\n"

            # 1. Webmail A Record
            curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
              -H "Authorization: Bearer $cf_token" -H "Content-Type: application/json" \
              -d "{\"type\":\"A\",\"name\":\"dispatch.$domain\",\"content\":\"$ipv4\",\"ttl\":1,\"proxied\":false}" >/dev/null

            # 2. Mail A Record
            curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
              -H "Authorization: Bearer $cf_token" -H "Content-Type: application/json" \
              -d "{\"type\":\"A\",\"name\":\"$maildomain\",\"content\":\"$ipv4\",\"ttl\":1,\"proxied\":false}" >/dev/null

            # 3. MX Record
            curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
              -H "Authorization: Bearer $cf_token" -H "Content-Type: application/json" \
              -d "{\"type\":\"MX\",\"name\":\"$domain\",\"content\":\"$maildomain\",\"priority\":10,\"ttl\":1}" >/dev/null

            # 4. SPF Record
            curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
              -H "Authorization: Bearer $cf_token" -H "Content-Type: application/json" \
              -d "{\"type\":\"TXT\",\"name\":\"$domain\",\"content\":\"v=spf1 mx a:$maildomain ip4:$ipv4 ~all\",\"ttl\":1}" >/dev/null

            # 5. DKIM Record
            curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
              -H "Authorization: Bearer $cf_token" -H "Content-Type: application/json" \
              -d "{\"type\":\"TXT\",\"name\":\"$subdom._domainkey.$domain\",\"content\":\"v=DKIM1; k=rsa; $pval\",\"ttl\":1}" >/dev/null

            # 6. DMARC Record
            curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
              -H "Authorization: Bearer $cf_token" -H "Content-Type: application/json" \
              -d "{\"type\":\"TXT\",\"name\":\"_dmarc.$domain\",\"content\":\"v=DMARC1; p=reject; rua=mailto:postmaster@$domain; fo=1\",\"ttl\":1}" >/dev/null

            printf "\033[32m✔ 6 DNS kaydının tamamı Cloudflare'a otomatik olarak eklendi!\033[0m\n"
        else
            printf "\033[31m✖ Cloudflare Zone ID bulunamadı. Lütfen API Token izinlerinizi kontrol edin.\033[0m\n"
        fi
    fi
fi

# Save full credentials and details to a persistent file
cat << EOF > "$HOME/dispatch_credentials.txt"
=============================================================
⚡ DISPATCH E-POSTA & SİSTEM YÖNETİM BİLGİLERİ
=============================================================
Domain:             $domain
Web Subdomain:      dispatch.$domain
Mail Subdomain:     $maildomain
Sunucu IPv4:        $ipv4
Sunucu IPv6:        $ipv6

--- YÖNETİCİ GİRİŞİ ---
Admin Panel URL:    https://dispatch.$domain/admin
Admin Şifresi:      $admin_pw
Kayıt Modu:         $reg_mode

--- DNS KAYITLARI TABLOSU ---
[A]    dispatch.$domain                 -> $ipv4 (DNS Only)
[A]    $maildomain                     -> $ipv4 (DNS Only)
[MX]   $domain                          -> $maildomain (Öncelik: 10)
[TXT]  $domain                          -> v=spf1 mx a:$maildomain ip4:$ipv4 ~all
[TXT]  $subdom._domainkey.$domain       -> v=DKIM1; k=rsa; $pval
[TXT]  _dmarc.$domain                   -> v=DMARC1; p=reject; rua=mailto:postmaster@$domain; fo=1
=============================================================
EOF

cp "$HOME/dispatch_credentials.txt" "/root/dispatch_credentials.txt" 2>/dev/null || true

printf "\n\033[32m=============================================================\033[0m\n"
printf "\033[32m✔ DISPATCH KURULUMU BAŞARIYLA TAMAMLANDI!\033[0m\n"
printf "Tüm kurulum bilgileri ve şifreler \033[34m~/dispatch_credentials.txt\033[0m dosyasına kaydedildi.\n\n"
printf "Yönetici Paneli URL: \033[33mhttps://$domain/admin\033[0m (Lokalde: \033[33mhttp://localhost:5173/admin\033[0m)\n"
printf "Yönetici Şifreniz:   \033[33m$admin_pw\033[0m\n"
printf "Kayıt Erişim Modu:   \033[33m$reg_mode\033[0m\n\n"

if [ "$reg_mode" = "admin_only" ]; then
    printf "\033[33mℹ NOT:\033[0m Kayıtlar 'Sadece Admin' modunda ayarlandı. Kullanıcılar dışarıdan kayıt olamaz, sadece /admin panelinden siz hesap oluşturabilirsiniz. Ana sayfada sadece 'Giriş Yap' aktif olacaktır.\n"
elif [ "$reg_mode" = "invite_only" ]; then
    printf "\033[33mℹ NOT:\033[0m Kayıtlar 'Davet Koduyla' modunda ayarlandı. Kayıt olurken kullanıcılardan ilk aşamada /admin panelinden oluşturduğunuz geçerli bir Davet Kodu istenecektir.\n"
else
    printf "\033[32mℹ NOT:\033[0m Kayıtlar 'Herkese Açık' modunda ayarlandı. İsteyen herkes yeni e-posta hesabı oluşturabilir.\n"
fi
printf "\033[32m=============================================================\033[0m\n\n"
