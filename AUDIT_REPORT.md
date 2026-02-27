# Ebizmate System Audit: Performance, Security, & Optimization

As requested, I have conducted a deep architectural review of the Ebizmate monorepo. Overall, the system is exceptionally well-architected. You have successfully implemented decoupling via BullMQ, tenant isolation via Drizzle ORM, and high-performance caching via Dragonfly. 

However, as a Principal Engineer, I have identified several critical weaknesses and areas for optimization that should be addressed before scaling.

---

## 🔒 1. Security Vulnerabilities

### A. Missing Webhook Cryptographic Validation (High Severity)
**The Issue:** Your `WebhookController` (`apps/api/src/webhook/webhook.controller.ts`) currently relies on an `InternalSecretGuard` to protect the ingestion endpoint. However, platforms like Meta (Instagram/Facebook) use cryptographic signatures (e.g., `x-hub-signature-256`) to verify that the payload actually came from them and wasn't tampered with.
**The Fix:** You need to implement a dedicated NestJS Guard that intercepts the raw request body, hashes it against your `APP_SECRET` from the Meta Developer Dashboard, and compares it to the `x-hub-signature` header. Without this, a malicious actor who discovers your webhook URL could spoof messages and drain your AI credits.

### B. Missing JWT Rotation / Expiry Controls (Medium Severity)
**The Issue:** The Admin dashboard uses NextAuth, and the API validates these JWTs. Short-lived JWTs (15 minutes) combined with HttpOnly Refresh Tokens are the enterprise standard. If your JWTs never expire, a stolen token grants perpetual access.
**The Fix:** Ensure token expiration is aggressively low, and investigate implementing a Dragonfly-backed token denylist for instant revocation when an admin logs out.

---

## ⚡ 2. Performance Bottlenecks

### A. Sequential AI Processing (High Severity)
**The Issue:** By default, BullMQ `WorkerHost` runs with a `concurrency` of `1`. This means if 100 people message your bot exactly right now, your server will process them sequentially (one by one). If each AI generation takes 3 seconds, the 100th person waits 5 minutes.
**The Fix:** You must explicitly increase the concurrency in your worker configuration. For a standard 2-core cloud server, setting `concurrency: 5` to `10` allows the server to multiplex LLM HTTP traffic without blocking the Node Event Loop.

### B. Next.js Admin Dashboard Over-fetching (Low Severity)
**The Issue:** The dashboard is fetching global stats and interactions. As the interactions table grows to millions of rows, `SELECT *` without proper pagination or indexing will cause the Next.js API endpoints to time out.
**The Fix:** Implement aggressive cursor-based pagination on all `/interactions` API routes and ensure postgres indexes exist on `(workspaceId, createdAt DESC)`.

---

## 🚀 3. Structural Optimizations

### A. LLM Context Window Bloat (Cost & Latency)
**The Issue:** You are currently retrieving the last 20 messages (`MAX_HISTORY_TURNS`) for every single AI inference. 20 messages can easily consume 4,000 to 6,000 tokens per request. At scale, this is exorbitantly expensive and significantly slows down the LLM's "Time to First Token" (TTFT).
**The Fix:** You have already started implementing a `summarizeCustomerProfile` background job. You should aggressively migrate to a "rolling memory" architecture: automatically compress the oldest 15 messages into a dense, 2-sentence summary stored on the `customers` database row, and only pass the last *5* raw messages to the LLM. 

### B. Postgres pgvector Indexing (Performance)
**The Issue:** If your knowledge base grows beyond 1,000 items, standard pgvector cosine similarity searches (`<->`) become linearly slow (O(N)).
**The Fix:** Create an `hnsw` or `ivfflat` index on your vector columns in Drizzle ORM. This reduces search time from milliseconds to microseconds, even with millions of knowledge base items, fundamentally shifting the math from O(N) to O(log N).

---

### Conclusion
Your application's foundation (BullMQ + Dragonfly + Drizzle) is enterprise-ready. To graduate to a production-hardened state, your top two priorities must be:
1. Building Webhook Signature Validation (`x-hub-signature`).
2. Increasing BullMQ AI Worker Concurrency to handle parallel bursts.
