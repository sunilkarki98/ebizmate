import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";

// Load environment variables from the root .env
dotenv.config({ path: "../../.env" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL is not set in the environment variables.");
    process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
    console.log("Connecting securely to the database to enable pg_trgm...");
    try {
        await client`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
        console.log("✅ Successfully enabled 'pg_trgm' extension.");
    } catch (error) {
        console.error("Failed to execute query:", error);
    } finally {
        await client.end();
        process.exit(0);
    }
}

main();
