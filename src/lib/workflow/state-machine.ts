
import { db } from "@/lib/db";
import { customers, interactions } from "@/db/schema";
import { eq } from "drizzle-orm";

export type ConversationState = "IDLE" | "AWAITING_ORDER_ID" | "AWAITING_BOOKING_DATE" | "AWAITING_ADDRESS" | "CONFIRMING_ORDER" | "HUMAN_TAKEOVER";

export interface StateContext {
    tempOrderId?: string;
    bookingDate?: string;
    address?: string;
    pendingOrder?: string;
    [key: string]: any;
}

interface StateTransitionResult {
    nextState: ConversationState;
    reply: string;
    contextUpdates?: Partial<StateContext>;
    action?: "escalate" | "none";
}

// --- State Handlers ---

async function handleIdle(input: string): Promise<StateTransitionResult | null> {
    const lower = input.toLowerCase();

    // Existing order check
    if (lower.includes("order status") || lower.includes("where is my order")) {
        return {
            nextState: "AWAITING_ORDER_ID",
            reply: "I can help with that! Please provide your Order ID (e.g., #12345).",
        };
    }

    // New Booking check
    if (lower.includes("book") || lower.includes("appointment") || lower.includes("reservation")) {
        return {
            nextState: "AWAITING_BOOKING_DATE",
            reply: "I'd love to help you book that! What date and time were you thinking of? (e.g., 'Tomorrow at 2pm', or 'Next Monday')",
        };
    }

    if (lower.includes("human") || lower.includes("agent") || lower.includes("support")) {
        return {
            nextState: "HUMAN_TAKEOVER",
            reply: "I'm connecting you to a human agent. They will be with you shortly.",
            action: "escalate",
        };
    }

    return null; // Stay in IDLE, let AI handle it
}

async function handleAwaitingOrderId(input: string, context: StateContext): Promise<StateTransitionResult> {
    // Regex for Order ID (simple example)
    const orderIdMatch = input.match(/#?(\d{4,6})/);

    if (orderIdMatch) {
        const orderId = orderIdMatch[1];
        // Mock lookup
        const status = "Shipped (Tracking: XYZ-999)"; // In real app, query Shopify/WooCommerce

        return {
            nextState: "IDLE",
            reply: `Order #${orderId} status: ${status}. Is there anything else I can help with?`,
            contextUpdates: { tempOrderId: orderId },
        };
    }

    return {
        nextState: "AWAITING_ORDER_ID",
        reply: "That doesn't look like a valid Order ID. Please try again (e.g., #12345) or type 'cancel' to exit.",
    };
}

async function handleAwaitingBookingDate(input: string, context: StateContext): Promise<StateTransitionResult> {
    // Basic catch-all to accept whatever they wrote as the date.
    // In a production app, we would use an LLM or date parser here to validate it.
    if (input.toLowerCase() === "cancel") {
        return { nextState: "IDLE", reply: "Okay, I've cancelled the booking process." };
    }

    return {
        nextState: "AWAITING_ADDRESS",
        reply: `Got it, I have noted "${input}" for the time. What is the delivery or service address for this booking?`,
        contextUpdates: { bookingDate: input, pendingOrder: "Service Booking" }
    };
}

async function handleAwaitingAddress(input: string, context: StateContext): Promise<StateTransitionResult> {
    if (input.toLowerCase() === "cancel") {
        return { nextState: "IDLE", reply: "Okay, I've cancelled the process.", contextUpdates: { bookingDate: undefined, address: undefined, pendingOrder: undefined } };
    }

    return {
        nextState: "CONFIRMING_ORDER",
        reply: `Thanks! I have the address as:\n${input}\n\nShall I go ahead and confirm your booking for ${context.bookingDate}? (Reply 'yes' to confirm or 'no' to cancel)`,
        contextUpdates: { address: input }
    };
}

async function handleConfirmingOrder(input: string, context: StateContext): Promise<StateTransitionResult> {
    const lower = input.toLowerCase();

    if (lower.includes("yes") || lower.includes("confirm") || lower.includes("sure") || lower.includes("ok")) {
        return {
            nextState: "IDLE",
            reply: `Great! Your booking is confirmed for ${context.bookingDate} at ${context.address}. We will see you then!`,
            contextUpdates: { bookingDate: undefined, address: undefined, pendingOrder: undefined } // clear context
        };
    } else {
        return {
            nextState: "IDLE",
            reply: "No problem, I've cancelled the booking process. Let me know if you need anything else!",
            contextUpdates: { bookingDate: undefined, address: undefined, pendingOrder: undefined }
        };
    }
}

// --- Main State Machine Runner ---

export async function processStateMachine(
    customerId: string,
    currentState: ConversationState,
    currentContext: StateContext,
    input: string
): Promise<{ reply: string | null; newState: ConversationState }> {

    let result: StateTransitionResult | null = null;

    switch (currentState) {
        case "IDLE":
            result = await handleIdle(input);
            break;
        case "AWAITING_ORDER_ID":
            if (input.toLowerCase() === "cancel") {
                result = { nextState: "IDLE", reply: "Okay, cancelled." };
            } else {
                result = await handleAwaitingOrderId(input, currentContext);
            }
            break;
        case "AWAITING_BOOKING_DATE":
            result = await handleAwaitingBookingDate(input, currentContext);
            break;
        case "AWAITING_ADDRESS":
            result = await handleAwaitingAddress(input, currentContext);
            break;
        case "CONFIRMING_ORDER":
            result = await handleConfirmingOrder(input, currentContext);
            break;
        case "HUMAN_TAKEOVER":
            // Don't auto-reset — require explicit action to resume AI
            return { reply: null, newState: "HUMAN_TAKEOVER" };
        default:
            // Unknown state, reset to IDLE
            result = { nextState: "IDLE", reply: "Let's start over. How can I help?" };
    }

    if (result) {
        // Save state transition
        await db.update(customers)
            .set({
                conversationState: result.nextState,
                conversationContext: { ...currentContext, ...result.contextUpdates },
                updatedAt: new Date(),
                // Check for escalation action
                aiPaused: result.action === "escalate" ? true : undefined,
            })
            .where(eq(customers.id, customerId));

        return { reply: result.reply, newState: result.nextState };
    }

    // No state transition triggered -> Return null to let generic AI handle it
    return { reply: null, newState: currentState };
}
