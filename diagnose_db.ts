
import { db } from "./packages/db/src/index.ts";
import { aiSettings, auditLogs } from "./packages/db/src/schema.ts";
import { desc } from "drizzle-orm";

async function diagnose() {
    try {
        console.log("--- ALL AI SETTINGS ---");
        const allSettings = await db.query.aiSettings.findMany();
        console.log(JSON.stringify(allSettings, null, 2));

        console.log("\n--- RECENT AUDIT LOGS ---");
        const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(20);
        for (const l of logs) {
            console.log(`[${l.createdAt.toISOString()}] ${l.action} - ${l.targetType}/${l.targetId}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

diagnose();
