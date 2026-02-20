import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
    console.log("Enabling vector extension...");
    try {
        await client`CREATE EXTENSION IF NOT EXISTS vector;`;
        console.log("Vector extension enabled successfully!");
    } catch (err) {
        console.error("Error enabling vector extension:", err);
    } finally {
        await client.end();
    }
}

main();
