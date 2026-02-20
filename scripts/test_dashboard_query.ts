
import "dotenv/config";
import { db } from "@/lib/db";
import { interactions, workspaces } from "@/db/schema";
import { eq, count, and } from "drizzle-orm";

async function main() {
    console.log("--- Testing Dashboard Queries ---");

    const workspaceId = "test-workspace-dm";

    // 1. Test Action Required Count
    const [actionRequiredCount] = await db
        .select({ count: count() })
        .from(interactions)
        .where(
            and(
                eq(interactions.workspaceId, workspaceId),
                eq(interactions.status, "ACTION_REQUIRED")
            )
        );

    console.log("Needs Attention Count:", actionRequiredCount.count);

    if (actionRequiredCount.count > 0) {
        console.log("✅ Query works and found items.");
    } else {
        console.log("⚠️ Query works but found 0 items (verify test data).");
    }

    // 2. Test Relations Fetch (as used in Interactions Page)
    const logs = await db.query.interactions.findMany({
        where: eq(interactions.workspaceId, workspaceId),
        limit: 1,
        with: {
            post: true,
        },
    });

    if (logs.length > 0) {
        console.log("✅ Relations fetch successful.");
        if (logs[0].post) {
            console.log("   - Found linked post:", logs[0].post.platformId);
        } else {
            console.log("   - Interaction has no linked post (expected for DMs).");
        }
    } else {
        console.log("⚠️ No interactions found to test relations.");
    }
}

main().catch(console.error).then(() => process.exit(0));
