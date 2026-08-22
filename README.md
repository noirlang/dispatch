# Dispatch

Smart email client built on EmailWiz (Postfix + Dovecot).

## Stack
- **Backend**: Ruby on Rails 8 (API)
- **Frontend**: Vite + React 18 + TypeScript
- **Database**: PostgreSQL
- **Queue**: Redis + Sidekiq
- **Email**: Postfix + Dovecot (via docker-mailserver locally)

## Local Development

```bash
# Start all services
cd docker
docker compose up -d

# Create test mail accounts
docker exec mailserver setup email add test@dispatch.local Test1234!
docker exec mailserver setup email add sender@dispatch.local Sender123!

# Run migrations
docker compose exec backend bin/rails db:create db:migrate

# Access
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
# Mailserver IMAP: localhost:143
```

## Features
- Approval queue (first-time senders)
- Speakeasy codes (trusted mail bypass)
- AI dashboard (Gemini/Claude/OpenAI)
- Spy pixel blocking (server-side image proxy)
- Vertical calendar
- RSS feed reader
- Thread merge

See [AGENTS.md](AGENTS.md) for full specification.
