import { db } from "@ebizmate/db";
import { orders, interactions, coachConversations } from "@ebizmate/db";
import { eq, and } from "drizzle-orm";

export interface CreateOrderInput {
    workspaceId: string;
    interactionId: string;
    customerId: string | null;
    customerName: string;
    customerPlatformId: string;
    customerMessage: string;
    type: "order" | "appointment" | "call_request";
    serviceType?: string;
    preferredTime?: string;
    phoneNumber?: string;
    customerNote?: string;
}

/**
 * Creates an order, injects a coach conversation message, and creates a system notification interaction
 * all within a single reliable database transaction.
 */
export async function createOrderTransaction(input: CreateOrderInput) {
    const typeLabels: Record<string, { emoji: string; label: string }> = {
        order: { emoji: "🛒", label: "New Order" },
        appointment: { emoji: "📅", label: "Appointment Request" },
        call_request: { emoji: "📞", label: "Call Request" },
    };
    const { emoji, label } = typeLabels[input.type] || typeLabels.order;

    return db.transaction(async (tx: any) => {
        // Enforce Idempotency: Ignore duplicate requests for the same interaction
        const existing = await tx.select().from(orders).where(
            and(
                eq(orders.workspaceId, input.workspaceId),
                eq(orders.interactionId, input.interactionId)
            )
        );
        if (existing.length > 0) {
            console.log(`[Idempotency] Order already exists for interaction ${input.interactionId}. Skipping duplicate creation.`);
            return existing[0];
        }

        // 1. Create order
        const [newOrder] = await tx.insert(orders).values({
            workspaceId: input.workspaceId,
            customerId: input.customerId,
            interactionId: input.interactionId,
            customerName: input.customerName,
            customerPlatformId: input.customerPlatformId,
            customerMessage: input.customerMessage,
            status: "pending",
            customerNote: input.customerNote || (input.type !== "order" ? input.type : undefined),
            serviceType: input.serviceType || undefined,
            preferredTime: input.preferredTime || undefined,
            phoneNumber: input.phoneNumber || undefined,
        }).returning();

        // 2. Coach message
        const coachMessage = [
            `${emoji} **${label} from ${input.customerName}!**`,
            ``,
            `Customer said: "${input.customerMessage.substring(0, 200)}"`,
            ``,
            `📋 Order ID: \`${newOrder.id.substring(0, 8)}\``,
            ``,
            `Reply **"confirm ${newOrder.id.substring(0, 8)}"** to confirm, or **"reject ${newOrder.id.substring(0, 8)}"** to reject.`,
        ].join("\n");

        await tx.insert(coachConversations).values({
            workspaceId: input.workspaceId,
            role: "coach",
            content: coachMessage,
        });

        // 3. System Notification
        await tx.insert(interactions).values({
            workspaceId: input.workspaceId,
            sourceId: "order_system",
            externalId: `order-${newOrder.id}-${Date.now()}`,
            authorId: "system_architect",
            authorName: "Order System",
            content: `${label}: "${input.customerMessage.substring(0, 200)}"`,
            response: `${emoji} ${label} from ${input.customerName}!\n\nCustomer: "${input.customerMessage.substring(0, 200)}"\n\nUse the AI Coach to confirm or reject this ${input.type}.`,
            status: "ACTION_REQUIRED",
            meta: {
                orderType: input.type,
                orderId: newOrder.id,
                originalInteractionId: input.interactionId,
            },
        });

        return newOrder;
    });
}
