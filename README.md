<div align="center">

# Dispatch

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="frontend/public/dispatch.png">
    <img src="frontend/public/dispatch.png" width="88" alt="dispatch logo" />
  </picture>
</p>

<p align="center">
  <strong>A focused, privacy-first intelligent email platform & client with two-way Thunderbird IMAP sync, email-powered blogging, approval queues, AI dashboard, and Maildir integration.</strong>
</p>

[Website](https://mail.noirlang.tr)

</div>

## Features

- **Bidirectional Thunderbird & Dovecot IMAP Synchronization:** Real-time `<1ms` Maildir delivery and two-way sync for Inbox, Sent, Drafts, Trash, and Approvals between desktop email clients (Thunderbird, Apple Mail) and Dispatch Webmail.
- **Email-Powered Blogging Engine:** Publish articles to the built-in public blog (`/@username/slug`) simply by emailing `blog@yourdomain.com`. Authors can instantly delete their published blogs by sending `Rm: <Blog Title>` or `rm: <slug>`.
- **Sender Approval Queue:** Automatically triage first-time incoming senders into an `Approvals` folder with one-click Approve / Block actions, auto-whitelisting on reply, and strict Maildir file migrations.
- **Privacy-Preserving Image Proxy & Spy Pixel Blocking:** External tracking pixels and remote email images are proxied through an isolated backend service with tracker domain blocking and SSRF protection.
- **Contact Groups & Smart Aliases:** Broadcast emails to contact groups using `@group_name` syntax (e.g. `@ekip`) with automatic member resolution and delivery to all members.
- **Speakeasy Codes (VIP Bypass):** Generate time-limited or single-use passcode tokens (e.g. `DISPATCH-VIP-2026`) that route incoming sender emails directly to the trusted Inbox.
- **Multi-Provider AI Email Analysis:** Deep email inspection (invoices, OTP codes, tracking numbers, flight tickets) and automated drafting powered by Google Gemini, Anthropic Claude, or OpenAI.
- **Interactive Email Reader:** Dynamic dark mode iframe typography with direct DOM stylesheet injection for crystal-clear readability, attachment previews, and multi-language translation.
- **Vertical Calendar & RSS Feed Reader:** Seamless vertical timeline calendar synced with email events and multi-category RSS feed aggregators with scheduled background workers.

## Tech Stack & Architecture

| Layer | Technology | Purpose |
| --- | --- | --- |
| **Frontend** | Vite + React 18 + TypeScript + Tailwind CSS | Ultra-fast, responsive dark/light theme webmail interface |
| **Backend API** | Ruby on Rails 8 (API Mode) + ActionMailbox | Inbound email routing, authentication, business logic & REST API |
| **Database** | PostgreSQL 16 | Relational data store for emails, threads, blogs, and users |
| **Workers & Cache** | Redis 7 + Sidekiq | Background RSS scraping, AI analysis, and async job queues |
| **Mail Server** | Postfix + Dovecot (Maildir++) | Production-grade SMTP/IMAP mail delivery stack |
| **Reverse Proxy** | Nginx | SSL termination, avatar serving, and static asset distribution |

## Quick Start & Installation

### 1. Production 1-Command Installation

On a clean Ubuntu / Debian Linux server, clone and run the deployment installer:

```bash
git clone https://github.com/noirlang/dispatch.git
cd dispatch
sudo bash install.sh
```

Follow the web-based setup wizard at `http://YOUR_SERVER_IP/setup` to configure your domain, admin user, and Cloudflare DNS automation.

### 2. Local Docker Development

```bash
# 1. Start Postgres, Redis, and Mailserver
cd docker
docker compose up -d

# 2. Add local test mailboxes
docker exec mailserver setup email add test@dispatch.local Test1234!
docker exec mailserver setup email add melih@dispatch.local Melih1234!

# 3. Add local domain to /etc/hosts
echo "127.0.0.1 mail.dispatch.local dispatch.local" | sudo tee -a /etc/hosts
```

### 3. Backend Setup

```bash
cd backend
bundle install
DATABASE_URL="postgresql://dispatch:dispatch_secret@localhost:5432/dispatch_dev" bin/rails db:create db:migrate
bin/rails s -p 3000 -b 0.0.0.0
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Visit **[http://localhost:5173](http://localhost:5173)** in your browser.

---

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://forgetag.noirlang.tr/sirket.png">
    <img src="https://forgetag.noirlang.tr/sirket.png" width="88" alt="NoirLang logo" />
  </picture>
</p>
