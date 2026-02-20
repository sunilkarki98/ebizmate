
import "dotenv/config";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking items table schematic...");
    const result = await db.execute(sql`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'items' AND column_name = 'embedding';
    `);

    if (result.rows.length > 0) {
        console.log("✅ Embedding column found:", result.rows[0]);
    } else {
        console.log("❌ Embedding column NOT found.");
    }
}

main().catch(console.error).then(() => process.exit(0));
