# EbizMate

Monorepo for the EbizMate AI automation platform: **Next.js** dashboard (`apps/web`), **NestJS** API (`apps/api`), shared **domain** logic (`packages/domain`), **database** schema (`packages/db`), **jobs** / BullMQ processors (`packages/jobs`), and **contracts** (Zod schemas).

## Structure

| Path | Role |
|------|------|
| `apps/web` | Next.js 16 app (dashboard, webhooks edge route, auth) |
| `apps/api` | NestJS API (`/api/*` global prefix) |
| `packages/domain` | Business logic (orchestrator, webhooks, coach, customer) |
| `packages/db` | Drizzle + PostgreSQL |
| `packages/contracts` | Shared request/response validation |
| `packages/shared` | Redis/Dragonfly, crypto, platform clients |

## Scripts (repo root)

- `npm run dev` — Turbo dev (requires `.env`; uses `dotenv-cli` if installed globally or via `npx`)
- `npm run build` — Production build
- `npm run lint` / `npm run check-types` — Quality gates
- `npm run db:*` — Drizzle migrations (see `packages/db`)

## Environment highlights

- **`NEXT_PUBLIC_API_URL`** — Nest origin, with or without trailing `/api` (the web app normalizes to `.../api`).
- **`INTERNAL_API_SECRET`** — Shared secret for Next → Nest internal calls (e.g. webhook forward).
- **`META_APP_ID` / `META_APP_SECRET`** — Meta OAuth and webhook verification.
- **`TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`** (or `TIKTOK_APP_*`) — TikTok OAuth.
- **`DATABASE_POOL_MAX`** — PostgreSQL pool size (default `30`).
- **`AI_PROCESS_CONCURRENCY`** / **`AI_INGEST_CONCURRENCY`** / **`AI_BATCH_CONCURRENCY`** — BullMQ worker concurrency.
- **`ENABLE_MOCK_SOCIAL_OAUTH`** — Set `true` to allow mock OAuth codes outside development (avoid in production).

## Docs

See `BACKEND_DEPLOY.md` and `FRONTEND_DEPLOY.md` for deployment notes.
