import { db } from "@ebizmate/db";
import { customers } from "@ebizmate/db";
import { eq, and } from "drizzle-orm";

export async function findCustomerByPlatformId(workspaceId: string, platformId: string) {
    return db.query.customers.findFirst({
        where: and(
            eq(customers.workspaceId, workspaceId),
            eq(customers.platformId, platformId)
        ),
    });
}

export async function updateCustomerPreferences(customerId: string, preferencesSummary: string) {
    return db.update(customers)
        .set({ preferencesSummary })
        .where(eq(customers.id, customerId));
}

export async function updateCustomerConversationState(
    customerId: string,
    conversationState: string,
    conversationContext: Record<string, any>
) {
    return db.update(customers)
        .set({
            conversationState,
            conversationContext,
            updatedAt: new Date(),
        })
        .where(eq(customers.id, customerId));
}
