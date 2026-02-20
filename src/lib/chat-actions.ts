"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { interactions, customers, workspaces } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

// Now accepts platformId (external ID) instead of internal UUID
export async function getConversationAction(platformId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    // 1. Get the user's workspace to ensure we look up the Correct Customer for this tenant make sure tenant isolation
    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, session.user.id),
    });

    if (!workspace) return { error: "Workspace not found" };

    // 2. Find the customer using platformId + workspaceId
    const customer = await db.query.customers.findFirst({
        where: and(
            eq(customers.workspaceId, workspace.id),
            eq(customers.platformId, platformId)
        ),
        with: {
            workspace: true,
        },
    });

    if (!customer) return { error: "Customer not found" };

    // 3. Fetch interactions
    const history = await db.query.interactions.findMany({
        where: and(
            eq(interactions.workspaceId, workspace.id),
            eq(interactions.authorId, platformId)
        ),
        orderBy: asc(interactions.createdAt), // Oldest first for chat view
        with: {
            post: true, // Include post context if available
        }
    });

    return {
        success: true,
        customer: {
            id: customer.id,
            name: customer.name || customer.platformHandle || "Unknown",
            handle: customer.platformHandle,
            platform: customer.workspace.platform,
            platformId: customer.platformId,
            image: null
        },
        messages: history
    };
}
