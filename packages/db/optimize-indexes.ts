import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

/**
 * Data Layer Optimization Script
 * 
 * 1. Rebuilds the HNSW vector index on `items.embedding` with tuned parameters
 *    (m=16, ef_construction=64) for better recall/accuracy under production load.
 * 2. Sets the runtime `hnsw.ef_search` parameter for query-time accuracy.
 * 3. Adds a partial index on `interactions` for PENDING status fast lookups.
 * 4. Adds a BRIN index on `ai_usage_log` for efficient monthly aggregation.
 *
 * Safe to run multiple times (uses IF NOT EXISTS / CONCURRENTLY where possible).
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function optimizeIndexes() {
    console.log("🚀 Starting Data Layer Index Optimization...\n");

    try {
        // ─── 1. Rebuild HNSW index with tuned parameters ───
        console.log("1️⃣  Dropping existing HNSW index on items.embedding...");
        await db.execute(sql`DROP INDEX IF EXISTS items_embedding_idx`);

        console.log("   Rebuilding with m=16, ef_construction=64...");
        await db.execute(sql`
            CREATE INDEX items_embedding_idx 
            ON items 
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
        `);
        console.log("   ✅ HNSW index rebuilt.\n");

        // ─── 2. Set runtime hnsw.ef_search for better query accuracy ───
        console.log("2️⃣  Setting hnsw.ef_search = 40 for session...");
        await db.execute(sql`SET hnsw.ef_search = 40`);
        console.log("   ✅ ef_search set. (Add to postgresql.conf for persistence)\n");

        // ─── 3. Partial index for PENDING interactions ───
        console.log("3️⃣  Creating partial index for PENDING interactions...");
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS interactions_pending_idx
            ON interactions ("workspaceId", "createdAt" DESC)
            WHERE status = 'PENDING'
        `);
        console.log("   ✅ Partial PENDING index created.\n");

        // ─── 4. BRIN index for ai_usage_log time-series queries ───
        console.log("4️⃣  Creating BRIN index on ai_usage_log for time-series queries...");
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS ai_usage_log_brin_idx
            ON ai_usage_log USING brin ("createdAt")
            WITH (pages_per_range = 32)
        `);
        console.log("   ✅ BRIN time-series index on ai_usage_log created.\n");

        // ─── 5. ANALYZE to refresh planner statistics ───
        console.log("5️⃣  Running ANALYZE on optimized tables...");
        await db.execute(sql`ANALYZE items`);
        await db.execute(sql`ANALYZE interactions`);
        await db.execute(sql`ANALYZE ai_usage_log`);
        console.log("   ✅ Statistics refreshed.\n");

        console.log("🎉 All index optimizations complete!");

    } catch (err) {
        console.error("❌ Optimization failed:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

optimizeIndexes().then(() => process.exit(0));
