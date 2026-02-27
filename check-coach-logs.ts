import "dotenv/config";
import { db, coachConversations } from "@ebizmate/db";
import { desc } from "drizzle-orm";

async function run() {
    try {
        const latestConvos = await db.query.coachConversations.findMany({
            orderBy: [desc(coachConversations.createdAt)],
            limit: 10
        });

        console.log("--- Latest 10 Coach Conversation Messages ---");
        for (const msg of latestConvos) {
            console.log(`[${msg.createdAt}] ${msg.role}: ${msg.content.substring(0, 150)}...`);
        }
    } catch (e) {
        console.error("Script failed:", e);
    }

    process.exit(0);
}

run();
