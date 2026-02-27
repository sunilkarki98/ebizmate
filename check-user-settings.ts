import "dotenv/config";
import { db, users, workspaces, aiSettings } from "@ebizmate/db";
import { eq } from "drizzle-orm";

async function run() {
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.email, "chettrisuneel6@gmail.com")
        });

        if (!user) {
            console.log("User not found");
            process.exit(0);
        }

        const workspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.userId, user.id)
        });

        if (!workspace) {
            console.log("Workspace not found");
            process.exit(0);
        }

        console.log(`Workspace: ${workspace.name} (${workspace.id})`);
        console.log(`allowGlobalAi: ${workspace.allowGlobalAi}`);

        const wsSettings = await db.query.aiSettings.findFirst({
            where: eq(aiSettings.workspaceId, workspace.id)
        });

        const globalSettings = await db.query.aiSettings.findFirst({
            where: eq(aiSettings.workspaceId, "global")
        });

        console.log("\n--- Workspace AI Settings ---");
        console.log(wsSettings || "None");

        console.log("\n--- Global AI Settings ---");
        console.log(globalSettings);

    } catch (e) {
        console.error("Script failed:", e);
    }

    process.exit(0);
}

run();
