# Backend Deployment Guide (Hetzner VM)

This file describes everything that runs on your Hetzner Virtual Machine (NestJS + Dragonfly).

---

## What Lives Here

The `apps/api` folder + `packages/jobs` + `packages/domain`. This is your private backend.
It runs as a single Docker container alongside a Dragonfly container.

### HTTP Endpoints (NestJS API)
These are INTERNAL — only your Vercel frontend calls them.
The public internet should NOT access these directly (use firewall rules).

| Endpoint | What It Does |
|----------|-------------|
| `POST /api/webhook/receive` | Receives validated webhooks FROM Vercel |
| `POST /api/auth/social/callback` | Stores encrypted OAuth tokens |
| `GET /api/items` | Returns knowledge base items |
| `POST /api/items` | Creates new items |
| `GET /api/interactions` | Returns customer conversations |
| `POST /api/coach/chat` | AI Coach chat endpoint |
| `GET /api/settings` | Returns workspace settings |
| `GET /api/health` | Health check |

### Background Workers (BullMQ — runs in the SAME process)
These workers listen to the Dragonfly queue and process jobs automatically:

| Worker | What It Does |
|--------|-------------|
| `AiProcessor` | Processes incoming customer messages through the AI bot |
| `ScheduledProcessor` | Runs cron jobs (follow-ups, profile summaries, etc.) |

---

## Webhook Flow (CONTINUED FROM FRONTEND)

Picking up from Step 5 in FRONTEND_DEPLOY.md:

```
STEP 5: Vercel sends the validated webhook to Hetzner:
        POST https://api.yourdomain.com/api/webhook/receive
         │
         ▼
STEP 6: NestJS WebhookController receives it:
        ✅ Checks the x-internal-secret header (rejects if wrong)
        ✅ Validates payload with Zod schema
         │
         ▼
STEP 7: Controller adds a JOB to the BullMQ queue in Dragonfly:
        queue.add('process_interaction', { payload, platform })
        → Returns 200 OK immediately (non-blocking)
         │
         ▼
STEP 8: AiProcessor (background worker) picks up the job:
        ✅ Loads the workspace and customer context
        ✅ Checks if AI is enabled for this workspace
        ✅ Fetches conversation history from database
        ✅ Sends everything to the AI provider (Groq/Gemini/OpenAI)
        ✅ Gets the AI-generated reply
         │
         ▼
STEP 9: AiProcessor saves the reply:
        ✅ Stores the reply in the database
        ✅ Publishes a real-time notification via Dragonfly pub/sub
        ✅ (Future) Sends the reply back to Instagram/TikTok via their API
```

---

## Docker Containers on Hetzner

Your `deploy/docker-compose.prod.yml` runs TWO containers:

```
┌──────────────────────────────────┐
│  ebizmate-api (Port 8080)        │
│  • NestJS HTTP Server            │
│  • BullMQ Workers (same process) │
│  • Connects to Postgres (remote) │
│  • Connects to Dragonfly (local) │
└──────────────┬───────────────────┘
               │ redis:// protocol
               ▼
┌──────────────────────────────────┐
│  ebizmate-dragonfly (Port 6379)  │
│  • In-memory data store          │
│  • BullMQ job queue              │
│  • Rate limiting cache           │
│  • Pub/Sub notifications         │
└──────────────────────────────────┘
```

---

## Environment Variables (Set in /opt/ebizmate/.env on Hetzner)

```
# Server
NODE_ENV=production
PORT=3001

# Database (hosted externally — Supabase, Neon, or your own Postgres)
DATABASE_URL=postgres://user:pass@host:5432/ebizmate

# Frontend URL (for CORS — must match your Vercel domain)
FRONTEND_URL=https://yourdomain.com

# Security
INTERNAL_API_SECRET=<must match Vercel>
ENCRYPTION_KEY=<32+ characters, for encrypting OAuth tokens>
AUTH_SECRET=<for JWT signing>

# Dragonfly (auto-configured by Docker Compose, usually no need to set)
# DRAGONFLY_URL is set automatically to dragonfly://ebizmate-dragonfly:6379

# AI Provider API Keys
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AI...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...

# Dragonfly container password
DRAGONFLY_PASSWORD=<strong password>
```

---

## How to Deploy

1. SSH into your Hetzner VM
2. Install Docker:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
   ```
3. Clone the repo:
   ```bash
   git clone <your-repo> /opt/ebizmate && cd /opt/ebizmate
   ```
4. Create the `.env` file with the variables above:
   ```bash
   nano /opt/ebizmate/.env
   ```
5. Start everything:
   ```bash
   docker compose -f deploy/docker-compose.prod.yml up -d --build
   ```
6. Verify it's running:
   ```bash
   curl http://localhost:8080/api/health
   ```
7. Set up NGINX reverse proxy to route `api.yourdomain.com` → `localhost:8080`
8. Enable SSL with: `sudo certbot --nginx -d api.yourdomain.com`
