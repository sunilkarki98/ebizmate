import "dotenv/config";
import { db } from "@ebizmate/db";

async function run() {
    try {
        const settings = await db.query.aiSettings.findFirst({
            where: (aiSettings, { eq }) => eq(aiSettings.workspaceId, "global")
        });
        console.log(settings);
    } catch (e) {
        console.error("Script failed:", e);
    }

    process.exit(0);
}

run();
