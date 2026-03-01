# Frontend Deployment Guide (Vercel)

This file describes everything that runs on Vercel (Next.js).

---

## What Lives Here

The `apps/web` folder. This is your public-facing website and dashboard.

### Public Pages (Static — cached globally by Vercel CDN)
- `/` — Landing page
- `/about` — About page
- `/contact` — Contact page
- `/privacy` — Privacy policy (required by Meta/TikTok)
- `/signin`, `/signup` — Auth pages

### Dashboard Pages (Dynamic — require login)
- `/dashboard` — Main merchant dashboard
- `/dashboard/connect` — OAuth connect page (Instagram, TikTok, Messenger)
- `/dashboard/coach` — AI Coach chat
- `/dashboard/knowledge` — Knowledge base management
- `/dashboard/customers` — Customer list
- `/dashboard/settings` — Workspace settings

### API Routes (Serverless Functions — run on Vercel Edge)
These are the critical routes that handle external platform communication:

| Route | What It Does |
|-------|-------------|
| `/api/webhook/[platform]` | **Receives webhooks from Meta/TikTok** (see Webhook Flow below) |
| `/api/auth/connect/[platform]` | Redirects user to Meta/TikTok OAuth consent screen |
| `/api/auth/callback/[platform]` | Receives the OAuth code after user approves, forwards to backend |
| `/api/auth/[...nextauth]` | NextAuth.js session management |
| `/api/health` | Health check |

---

## Webhook Flow (THIS IS IMPORTANT)

When a customer sends a DM to your Instagram/TikTok, here is EXACTLY what happens:

```
STEP 1: Customer sends "Hi, how much is this?" on Instagram DM
         │
         ▼
STEP 2: Meta's servers POST the message to YOUR Vercel URL:
        POST https://yourdomain.com/api/webhook/instagram
        Body: { "entry": [{ "messaging": [{ "message": { "text": "Hi..." }}]}]}
         │
         ▼
STEP 3: Vercel Edge Function (apps/web/src/app/api/webhook/[platform]/route.ts):
        ✅ Verifies the SHA256 signature (prevents fake webhooks)
        ✅ Parses and validates the JSON with Zod
        ✅ Returns 200 OK immediately to Meta (they require fast response)
         │
         ▼
STEP 4: AFTER returning 200, the Vercel function makes an INTERNAL fetch():
        POST https://api.yourdomain.com/api/webhook/receive
        Headers: { "x-internal-secret": "YOUR_INTERNAL_API_SECRET" }
        Body: the validated webhook payload
         │
         ▼
STEP 5: This request arrives at your HETZNER server (NestJS backend)
        → See BACKEND_DEPLOY.md for what happens next
```

**Key Point:** Meta/TikTok ONLY talk to Vercel. They never see your Hetzner server.
The `INTERNAL_API_SECRET` header is how Vercel proves to Hetzner that the request is legit.

---

## Environment Variables (Set in Vercel Dashboard)

```
# App URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com    ← Points to Hetzner!

# Auth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

# Database (for NextAuth sessions & server components)
DATABASE_URL=postgres://user:pass@host:5432/ebizmate

# Webhook Security (must match what you enter in Meta/TikTok developer portals)
WEBHOOK_VERIFY_TOKEN=<your verify token>
WEBHOOK_SECRET=<your webhook secret>

# Internal Communication (must match backend)
INTERNAL_API_SECRET=<shared secret between Vercel and Hetzner>

# Dragonfly (for rate limiting on Edge)
DRAGONFLY_URL=<optional, only if you need edge rate limiting>
```

---

## How to Deploy

1. Go to vercel.com → Import Git Repository
2. Vercel auto-detects Turborepo and builds `apps/web`
3. Add the environment variables above in Vercel Dashboard → Settings → Environment Variables
4. Deploy
5. Set your custom domain (e.g., yourdomain.com)
