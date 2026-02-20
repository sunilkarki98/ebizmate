
import "dotenv/config";
import { db } from "@/lib/db";
import { customers, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("--- Testing CRM (Customer Records) ---");

    const workspaceId = "test-workspace-dm";
    const platformId = "user-crm-test";
    const handle = "TestUserFromScript";

    // 1. Setup Workspace (Ensure it exists)
    await db.insert(workspaces).values({
        id: workspaceId,
        name: "Test Shop CRM",
        userId: "test-user-id", // Assumes user exists from previous tests
        platform: "generic",
    }).onConflictDoNothing();

    console.log("1. Workspace Setup Complete.");

    // 2. Simulate First Interaction (New Customer)
    console.log("2. Simulating First Interaction...");
    await db.insert(customers).values({
        workspaceId,
        platformId,
        platformHandle: handle,
        name: handle,
        lastInteractionAt: new Date(),
    }).onConflictDoUpdate({
        target: [customers.workspaceId, customers.platformId],
        set: {
            platformHandle: handle,
            lastInteractionAt: new Date(),
        }
    });

    const firstCheck = await db.query.customers.findFirst({
        where: eq(customers.platformId, platformId),
    });
    console.log("   - Customer Created:", !!firstCheck);
    console.log("   - Handle:", firstCheck?.platformHandle);

    // 3. Simulate New Interaction (Update Customer)
    console.log("3. Simulating Return Visit (Handle Change)...");
    const newHandle = "UpdatedUserHandle";
    await db.insert(customers).values({
        workspaceId,
        platformId,
        platformHandle: newHandle,
        name: newHandle,
        lastInteractionAt: new Date(),
    }).onConflictDoUpdate({
        target: [customers.workspaceId, customers.platformId],
        set: {
            platformHandle: newHandle,
            lastInteractionAt: new Date(),
        }
    });

    const secondCheck = await db.query.customers.findFirst({
        where: eq(customers.platformId, platformId),
    });
    console.log("   - Customer Updated:", secondCheck?.platformHandle === newHandle);
    console.log("   - Handle:", secondCheck?.platformHandle);

    if (firstCheck && secondCheck?.platformHandle === newHandle) {
        console.log("✅ CRM Upsert Logic Verified!");
    } else {
        console.error("❌ CRM Verification Failed.");
    }
}

main().catch(console.error).then(() => process.exit(0));
