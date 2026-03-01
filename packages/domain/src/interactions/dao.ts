import { db } from "@ebizmate/db";
import { interactions } from "@ebizmate/db";
import { eq, and, inArray, gte, sql } from "drizzle-orm";

export async function getInteractionWithRelations(interactionId: string) {
    return db.query.interactions.findFirst({
        where: eq(interactions.id, interactionId),
        with: { workspace: true, post: true, customer: true },
    });
}

export async function updateInteractionStatus(
    interactionId: string,
    updateData: {
        status?: "PENDING" | "PROCESSED" | "NEEDS_REVIEW" | "FAILED" | "IGNORED" | "ACTION_REQUIRED";
        response?: string;
        meta?: Record<string, any>;
    }
) {
    return db.update(interactions)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(interactions.id, interactionId));
}

export async function saveSystemEventInteraction(
    workspaceId: string,
    originalInteractionId: string,
    authorId: string,
    authorName: string | null,
    systemEventMsg: string,
    reply: string,
    coachNote: string | null
) {
    return db.insert(interactions).values({
        workspaceId,
        sourceId: "system_event",
        externalId: `sys-${Date.now()}`,
        authorId,
        authorName,
        content: `(System Event: ${systemEventMsg}${coachNote ? ` Note: ${coachNote}` : ''})`,
        response: reply,
        status: "PROCESSED",
        meta: { isSystemNotification: true, originalInteractionId },
    });
}

export async function countActiveChats(workspaceId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(distinct ${interactions.authorId})` })
        .from(interactions)
        .where(
            and(
                eq(interactions.workspaceId, workspaceId),
                inArray(interactions.status, ["PENDING", "NEEDS_REVIEW", "ACTION_REQUIRED"]),
                // Look at the last 24 hours to avoid historic stale data
                gte(interactions.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
            )
        );
    return Number(result[0]?.count || 0);
}
