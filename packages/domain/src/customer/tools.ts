import { db, workspaces, customers, items, orders } from "@ebizmate/db";
import { eq, and, inArray } from "drizzle-orm";
import { AddToCartSchema, CheckoutSchema, ShowProductCarouselSchema, RequestDiscountSchema, CheckOrderStatusSchema } from "@ebizmate/contracts";

export interface CustomerToolContext {
    workspaceId: string;
    customerId: string;
    customerName: string;
    customerPlatformId: string;
    interactionId: string;
    customerMessage: string;
    createOrderAndNotify: (input: any) => Promise<void>;
}

export type ToolResult =
    | { success: true; message: string; systemAction?: "checkout" | "show_carousel"; platformPayload?: any }
    | { success: false; message: string };

function buildCartSummary(context: any): string {
    const items = context.cart || [];
    if (items.length === 0) return "Cart is empty.";
    return items.map((i: any) => `${i.quantity}x ${i.productName} ($${i.price * i.quantity})`).join(", ");
}

export async function executeCustomerTool(
    name: string,
    args: Record<string, unknown>,
    ctx: CustomerToolContext
): Promise<ToolResult> {
    const customer = await db.query.customers.findFirst({
        where: eq(customers.id, ctx.customerId),
    });

    if (!customer) {
        return { success: false, message: "Customer not found." };
    }

    const conversationContext = (customer.conversationContext as Record<string, any>) || { cart: [] };
    if (!conversationContext.cart) conversationContext.cart = [];

    if (name === "add_to_cart") {
        try {
            const parsed = AddToCartSchema.parse(args);

            // Real-time Inventory Check
            const item = await db.query.items.findFirst({
                where: and(eq(items.workspaceId, ctx.workspaceId), eq(items.id, parsed.productId))
            });

            if (!item) {
                return { success: false, message: "Item not found in database." };
            }

            if (item.inventoryCount !== null && item.inventoryCount < parsed.quantity) {
                return {
                    success: false,
                    message: `Item out of stock or requested quantity exceeds available stock. We only have ${item.inventoryCount} left. Apologize and let the customer know.`
                };
            }

            conversationContext.cart.push(parsed);

            await db.update(customers).set({
                conversationContext,
                updatedAt: new Date(),
            }).where(eq(customers.id, ctx.customerId));

            const summary = buildCartSummary(conversationContext);
            return {
                success: true,
                message: `Excellent! I've gone ahead and added ${parsed.quantity}x ${parsed.productName} to your cart. Current Cart:\n${summary}\nPROMPT RULE: Tell the user you've added it, and IMMEDIATELY ask if they are ready to check out or if they want to keep shopping. Be enthusiastic!`,
            };
        } catch (err: any) {
            return { success: false, message: `Failed to add to cart: ${err.message}` };
        }
    }

    if (name === "checkout") {
        try {
            const parsed = CheckoutSchema.parse(args);

            if (conversationContext.cart.length === 0) {
                return { success: false, message: "Cannot checkout: the cart is empty." };
            }

            const summary = buildCartSummary(conversationContext);
            let orderNotes = `Cart Items:\n${summary}`;

            if (parsed.deliveryAddress) orderNotes += `\nAddress: ${parsed.deliveryAddress}`;
            if (parsed.notes) orderNotes += `\nCustomer Notes: ${parsed.notes}`;

            // Trigger the native DB transaction
            await ctx.createOrderAndNotify({
                workspaceId: ctx.workspaceId,
                interactionId: ctx.interactionId,
                customerId: ctx.customerId,
                customerName: ctx.customerName,
                customerPlatformId: ctx.customerPlatformId,
                customerMessage: ctx.customerMessage,
                type: "order",
                phoneNumber: parsed.customerPhone,
                customerNote: orderNotes
            });

            // Clear the cart and update lastPurchaseAt
            await db.update(customers).set({
                conversationContext: { cart: [] },
                lastPurchaseAt: new Date(),
                updatedAt: new Date(),
            }).where(eq(customers.id, ctx.customerId));

            return {
                success: true,
                message: `Order completed successfully. Phone: ${parsed.customerPhone}. Tell the user their order is confirmed and the seller will contact them shortly.`,
                systemAction: "checkout"
            };
        } catch (err: any) {
            return { success: false, message: `Failed to checkout: ${err.message}` };
        }
    }

    if (name === "show_product_carousel") {
        try {
            const parsed = ShowProductCarouselSchema.parse(args);
            if (!parsed.itemIds || parsed.itemIds.length === 0) {
                return { success: false, message: "No itemIds provided." };
            }

            // FIX #9: Scope to workspace to prevent cross-workspace data leak
            const records = await db.query.items.findMany({
                where: and(inArray(items.id, parsed.itemIds), eq(items.workspaceId, ctx.workspaceId)),
                limit: 10 // Max 10 items in a generic carousel template
            });

            if (records.length === 0) {
                return { success: false, message: "None of the requested item IDs were found in the database." };
            }

            // Build the platform generic template payload
            const carouselItems = records.map(item => {
                const images = Array.isArray(item.images) ? (item.images as string[]) : [];
                const primaryImage = images.length > 0 ? images[0] : undefined;

                // Try to extract price from meta if available
                const meta = item.meta as Record<string, any> | null;
                const priceStr = meta?.price ? ` - ${meta.price}` : "";

                return {
                    title: `${item.name}${priceStr}`,
                    subtitle: item.content?.substring(0, 80) || "View product details",
                    imageUrl: primaryImage,
                    // If no URL is present, they just message back to buy
                    buttonText: item.url ? "View on Website" : "Buy / Ask",
                    buttonPayload: item.url || undefined,
                };
            });

            // Update abandonment tracking
            await db.update(customers).set({
                lastCarouselSentAt: new Date(),
                abandonmentStatus: "PENDING",
            }).where(eq(customers.id, ctx.customerId));

            return {
                success: true,
                message: `Successfully showed a rich media carousel containing ${records.length} products to the user. Do not try to describe the products in text anymore, as they are already looking at them. Simply ask a very short question like "Which of these do you like?" or "Do any of these catch your eye?".`,
                systemAction: "show_carousel",
                platformPayload: { carouselItems }
            };
        } catch (err: any) {
            console.error("[Tools] Carousel failed:", err);
            return { success: false, message: `Failed to show carousel: ${err.message}` };
        }
    }

    if (name === "request_discount") {
        try {
            const parsed = RequestDiscountSchema.parse(args);

            // We handle the escalation (creating an order in "negotiating" state and waking up Coach) 
            // completely natively in the processor or here. We will do it utilizing the createOrderAndNotify function.
            const summary = buildCartSummary(conversationContext);
            const notes = `DISCOUNT REQUEST: Customer is asking for ${parsed.requestedDiscountPercentage}% off of ${parsed.productName}.\nCurrent Cart:\n${summary}`;

            await ctx.createOrderAndNotify({
                workspaceId: ctx.workspaceId,
                interactionId: ctx.interactionId,
                customerId: ctx.customerId,
                customerName: ctx.customerName,
                customerPlatformId: ctx.customerPlatformId,
                customerMessage: ctx.customerMessage,
                type: "order", // we treat this as a pending order that needs seller negotiation
                customerNote: notes
            });

            // We must update the DB to place them in NEGOTIATING status
            // Note: createOrderAndNotify creates it as "pending" initially. We'll update it to "negotiating" where the processor wakes up.

            return {
                success: true,
                message: "Discount request successfully submitted to the manager (Seller). Tell the customer to please wait a moment while you verify if the discount can be approved. DO NOT make any further tool calls until they respond.",
            };

        } catch (err: any) {
            return { success: false, message: `Failed to request discount: ${err.message}` };
        }
    }

    if (name === "check_order_status") {
        try {
            const parsed = CheckOrderStatusSchema.parse(args);
            // Dynamic WIMO query based on orderId or generic customer query
            let queryConditions = [eq(orders.workspaceId, ctx.workspaceId), eq(orders.customerId, ctx.customerId)];
            if (parsed.orderId) {
                queryConditions.push(eq(orders.id, parsed.orderId));
            }

            const recentOrders = await db.query.orders.findMany({
                where: and(...queryConditions),
                orderBy: (orders, { desc }) => [desc(orders.createdAt)],
                limit: 1
            });

            if (recentOrders.length === 0) {
                return {
                    success: true,
                    message: "I looked up their history but could not find any orders for this customer. Inform them that you don't see any recent orders."
                };
            }

            const order = recentOrders[0];
            return {
                success: true,
                message: `Found Order ${order.id.substring(0, 8)}: Status is '${order.status}'. Shipping Status is '${order.shippingStatus}'. Tracking URL is '${order.trackingUrl || "Not available yet"}'. Please relay this tracking information clearly and politely to the customer.`
            };
        } catch (err: any) {
            return { success: false, message: `Failed to check order status: ${err.message}` };
        }
    }

    return { success: false, message: `Unknown tool: ${name}` };
}
