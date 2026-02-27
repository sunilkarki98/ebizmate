import "dotenv/config";
import { db, workspaces } from "@ebizmate/db";
import { lt } from "drizzle-orm";

async function run() {
    console.log("--- Fixing ALL Expired Workspaces ---");
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    try {
        const expiredWorkspaces = await db.query.workspaces.findMany({
            where: lt(workspaces.trialEndsAt, now),
        });

        console.log(`Found ${expiredWorkspaces.length} workspaces with an expired trial date created by the bug.`);

        for (const ws of expiredWorkspaces) {
            await db.update(workspaces)
                .set({ trialEndsAt: sevenDaysFromNow })
                .where(lt(workspaces.trialEndsAt, now));
            console.log(`-> Fixed workspace ID: ${ws.name} (${ws.id}) (Extended 7 days)`);
        }
    } catch (e) {
        console.error("Script failed:", e);
    }

    process.exit(0);
}

run();
