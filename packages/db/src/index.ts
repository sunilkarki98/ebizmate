export * from "./schema.js";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

const globalForDb = globalThis as unknown as {
    conn: Pool | undefined;
};

const conn =
    globalForDb.conn ??
    (() => {
        if (!process.env['DATABASE_URL']) {
            // Note: During Next.js build, this might be missing. 
            // We only throw if something actually tries to use the connection.
            return undefined;
        }
        return new Pool({
            connectionString: process.env['DATABASE_URL'],
            connectionTimeoutMillis: 10000,
            max: 10,
        });
    })();

if (process.env['NODE_ENV'] !== "production") {
    globalForDb.conn = conn;
}

export const db = drizzle(conn!, { schema });

let _healthChecked = false;

export async function checkDbHealth(): Promise<boolean> {
    if (_healthChecked) return true;

    try {
        const client = await conn.connect();
        client.release();
        _healthChecked = true;
        return true;
    } catch (err) {
        console.error("DB Connection Failed:", err);
        return false;
    }
}