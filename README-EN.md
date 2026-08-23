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
  <strong>A focused, privacy-first intelligent email platform & client with two-way Thunderbird IMAP sync, email-powered blogging, approval queues, AI dashboard, and Maildir integration.</strong>
</p>

[Website](https://mail.noirlang.tr)

</div>

## Feature Demos & Video Previews

---

### 1. 🛡️ Sender Approval Queue, AI Dashboard & Calendar Integration
> First-time incoming senders are safely routed to an `Approvals` queue with 1-click Approve / Block actions. Key details like meetings, tracking codes, and deadlines are automatically detected by AI, converted into Dashboard cards, and synced to the Calendar.

https://github.com/user-attachments/assets/dispatch-onay-ai-pano-takvim.mp4

---

### 2. 🤖 AI Email Summarization & Smart Reply Engine
> Long and complex emails are summarized into concise 2-3 bullet points within seconds using Google Gemini, Claude, or OpenAI models; contextual and intelligent response drafts can be generated with a single click.

https://github.com/user-attachments/assets/dispatch-aiozet-aiyanit.mp4

---

### 3. 🌐 AI-Powered Multi-Language Email Translation
> Foreign language emails are instantly translated into English, Turkish, or other target languages directly inside the reader while preserving layout, typography, and original tone.

https://github.com/user-attachments/assets/dispatch-ai-ceviri.mp4

---

### 4. 👥 Email Management, Contact Groups & Smart Aliases
> Manage Inbox, Sent, and Draft folders with full search; broadcast messages to saved contact groups using `@group_name` syntax (e.g. `@team`) with automatic member resolution and simultaneous delivery.

https://github.com/user-attachments/assets/dispatch-mail-grup.mp4

---

### 5. 📰 Integrated RSS Feed Reader & Background Sync
> Subscribe to favorite tech blogs, news sites, and developer feeds; scheduled Sidekiq background workers fetch and synchronize updates periodically without leaving the email experience.

https://github.com/user-attachments/assets/dispatch-akis-rss.mp4

---

## All Core Features

- **Bidirectional Thunderbird & Dovecot IMAP Synchronization:** Real-time `<1ms` Maildir delivery and two-way sync for Inbox, Sent, Drafts, Trash, and Approvals between desktop email clients (Thunderbird, Apple Mail) and Dispatch Webmail.
- **Email-Powered Blogging Engine:** Publish articles to the built-in public blog (`/@username/slug`) simply by emailing `blog@yourdomain.com`. Authors can instantly delete their published blogs by sending `Rm: <Blog Title>` or `rm: <slug>`.
- **Sender Approval Queue:** Automatically triage first-time incoming senders into an `Approvals` folder with one-click Approve / Block actions, auto-whitelisting on reply, and strict Maildir file migrations.
- **Privacy-Preserving Image Proxy & Spy Pixel Blocking:** External tracking pixels and remote email images are proxied through an isolated backend service with tracker domain blocking and SSRF protection.
- **Contact Groups & Smart Aliases:** Broadcast emails to contact groups using `@group_name` syntax (e.g. `@team`) with automatic member resolution and delivery to all members.
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
git clone https://github.com/melihemik/dispatch.git
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
