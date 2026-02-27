import "dotenv/config";
import { db, workspaces, aiSettings } from "@ebizmate/db";
import { lt, isNotNull, or } from "drizzle-orm";

async function run() {
    console.log("--- 1. Fixing Expired Workspaces ---");
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
            console.log(`-> Fixed workspace ID: ${ws.id} (Extended 7 days)`);
        }

        console.log("\n--- 2. Checking for User LLM Keys (BYOK) ---");
        const workspacesWithKeys = await db.query.aiSettings.findMany({
            where: or(
                isNotNull(aiSettings.openaiApiKey),
                isNotNull(aiSettings.geminiApiKey),
                isNotNull(aiSettings.groqApiKey),
                isNotNull(aiSettings.openrouterApiKey)
            ),
            with: {
                workspace: true
            }
        });

        const userKeys = workspacesWithKeys.filter(ws => ws.workspaceId !== "global");

        if (userKeys.length === 0) {
            console.log("No non-global users currently have their own API keys saved in the database.");
        } else {
            for (const setting of userKeys) {
                console.log(`User/Workspace [${setting.workspace.name}] (${setting.workspaceId}) HAS CUSTOM KEYS:`);
                if (setting.openaiApiKey) console.log(" - OpenAI Configured");
                if (setting.geminiApiKey) console.log(" - Gemini Configured");
                if (setting.groqApiKey) console.log(" - Groq Configured");
                if (setting.openrouterApiKey) console.log(" - OpenRouter Configured");
            }
        }

    } catch (e) {
        console.error("Script failed:", e);
    }

    process.exit(0);
}

run();
