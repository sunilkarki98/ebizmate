import "dotenv/config";
import { db, workspaces } from "@ebizmate/db";
import { desc } from "drizzle-orm";

async function run() {
    try {
        const latestWorkspaces = await db.query.workspaces.findMany({
            orderBy: [desc(workspaces.createdAt)],
            limit: 3
        });

        console.log("--- Latest 3 Workspaces ---");
        for (const ws of latestWorkspaces) {
            console.log(`\nWorkspace ID: ${ws.id}`);
            console.log(`Name: ${ws.name}`);
            console.log(`Plan: ${ws.plan}`);
            console.log(`Status: ${ws.status}`);
            console.log(`Trial Ends At: ${ws.trialEndsAt}`);
            console.log(`Is Trial Expired?: ${ws.trialEndsAt && new Date(ws.trialEndsAt) < new Date()}`);
            console.log(`Allow Global AI: ${ws.allowGlobalAi}`);
            console.log(`AI Blocked (Hard Kill): ${ws.aiBlocked}`);
        }

    } catch (e) {
        console.error("Script failed:", e);
    }

    process.exit(0);
}

run();
