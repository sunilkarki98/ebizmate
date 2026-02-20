import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

async function main() {
    console.log("Enabling vector extension...");
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("Vector extension enabled!");
}

main().catch(console.error).then(() => process.exit(0));
