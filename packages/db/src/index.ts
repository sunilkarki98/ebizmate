import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";
export * from "./schema.js";

const globalForDb = globalThis as unknown as {
    conn: Pool | undefined;
};

if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL environment variable is missing. Database connection cannot be established.");
}

const conn = globalForDb.conn ?? new Pool({
    connectionString: process.env["DATABASE_URL"],
    connectionTimeoutMillis: 10000,
    max: 10, // Explicit pool size to prevent connection exhaustion
});

if (process.env["NODE_ENV"] !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });

// --- Connection Health Check ---
// Exported so it can be called explicitly (e.g., from a health endpoint).
// Not auto-fired as an IIFE — that runs on every import and silently swallows errors.
let _healthChecked = false;
export async function checkDbHealth(): Promise<boolean> {
    if (_healthChecked) return true;
    try {
        const client = await conn.connect();
        console.log("✅ [DB] Successfully connected to PostgreSQL");
        client.release();
        _healthChecked = true;
        return true;
    } catch (err) {
        console.error("❌ [DB] Connection Failed:", err);
        return false;
    }
}
