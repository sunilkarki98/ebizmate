
import { db } from "@ebizmate/db";
import { customers } from "@ebizmate/db";
import { eq } from "drizzle-orm";

// ── States ──────────────────────────────────────────────────────────────────

export type ConversationState =
    | "IDLE"
    | "AWAITING_ORDER_ID"
    // Product Order flow
    | "COLLECTING_ORDER"
    | "CONFIRMING_ORDER"
    // Appointment / Booking flow
    | "COLLECTING_SERVICE"
    | "COLLECTING_BOOKING_TIME"
    | "CONFIRMING_BOOKING"
    // Call request flow
    | "COLLECTING_PHONE"
    | "COLLECTING_CALL_TIME"
    | "CONFIRMING_CALL"
    // Negotiation flow
    | "AWAITING_PROPOSAL_RESPONSE"
    // Legacy
    | "HUMAN_TAKEOVER";

// ── Context ─────────────────────────────────────────────────────────────────

export interface StateContext {
    // Collection data
    collectionType?: "order" | "appointment" | "call_request";
    orderDetails?: string;
    serviceType?: string;
    preferredTime?: string;
    phoneNumber?: string;
    address?: string;
    // Passthrough from processor (needed for order creation)
    workspaceId?: string;
    interactionId?: string;
    customerName?: string;
    customerPlatformId?: string;
    customerId?: string;
    customerMessage?: string;
    // Negotiation
    orderId?: string;
    proposal?: string;
    // Legacy
    tempOrderId?: string;
    bookingDate?: string;
    pendingOrder?: string;
    [key: string]: any;
}

// ── Callback for order creation (set by domain package to avoid circular dep) ──

type OrderCreatorFn = (input: {
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
}) => Promise<void>;

let _orderCreator: OrderCreatorFn | null = null;

export function setOrderCreator(fn: OrderCreatorFn) {
    _orderCreator = fn;
}

// ── Callback for intent detection ───────────────────────────────────────────

type IntentDetectorFn = (
    workspaceId: string,
    message: string,
    interactionId?: string,
) => Promise<"yes" | "no" | "unknown">;

let _intentDetector: IntentDetectorFn | null = null;

export function setIntentDetector(fn: IntentDetectorFn) {
    _intentDetector = fn;
}

// ── Intent Helper ───────────────────────────────────────────────────────────

async function detectIntent(workspaceId: string | undefined, input: string, interactionId?: string): Promise<"yes" | "no" | "unknown"> {
    if (_intentDetector && workspaceId) {
        return await _intentDetector(workspaceId, input, interactionId);
    }
    const lower = input.toLowerCase();
    if (lower.includes("yes") || lower.includes("confirm") || lower.includes("sure") || lower.includes("ok") || lower.includes("perfect") || lower.includes("fine")) return "yes";
    if (lower.includes("no") || lower.includes("cancel") || lower.includes("nevermind") || lower.includes("nahi") || lower.includes("nai")) return "no";
    return "unknown";
}

// ── State Transition Result ─────────────────────────────────────────────────

interface StateTransitionResult {
    nextState: ConversationState;
    reply: string;
    contextUpdates?: Partial<StateContext>;
    action?: "escalate" | "create_order" | "none";
}

// ── State Handlers ──────────────────────────────────────────────────────────

async function handleIdle(input: string): Promise<StateTransitionResult | null> {
    const lower = input.toLowerCase();

    // Order status check
    if (lower.includes("order status") || lower.includes("where is my order")) {
        return {
            nextState: "AWAITING_ORDER_ID",
            reply: "I can help with that! Please provide your Order ID (e.g., #12345).",
        };
    }

    // Human escalation
    if (lower.includes("human") || lower.includes("agent") || lower.includes("support")) {
        return {
            nextState: "HUMAN_TAKEOVER",
            reply: "I'm connecting you to a human agent. They will be with you shortly.",
            action: "escalate",
        };
    }

    // NOTE: booking/appointment/call triggers are now handled by the AI pipeline
    // via suggestedActions → processor sets the collection state.
    // The state machine IDLE handler no longer triggers these directly.

    return null; // Stay in IDLE, let AI handle it
}

async function handleAwaitingOrderId(input: string, context: StateContext): Promise<StateTransitionResult> {
    const orderIdMatch = input.match(/#?(\d{4,6})/);

    if (orderIdMatch) {
        const orderId = orderIdMatch[1];
        const status = "Shipped (Tracking: XYZ-999)"; // TODO: query actual order system
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

// ── Product Order Flow ──────────────────────────────────────────────────────

async function handleCollectingOrder(input: string, context: StateContext): Promise<StateTransitionResult> {
    if (input.toLowerCase() === "cancel") {
        return { nextState: "IDLE", reply: "No problem, I've cancelled the order process.", contextUpdates: clearContext() };
    }

    return {
        nextState: "CONFIRMING_ORDER",
        reply: `Got it! You'd like to order:\n\n🛍️ **Items**: ${input}\n\nShall I submit this order to the team? (Reply 'yes' to confirm or 'no' to cancel)`,
        contextUpdates: { orderDetails: input },
    };
}

async function handleConfirmingOrder(input: string, context: StateContext): Promise<StateTransitionResult> {
    const intent = await detectIntent(context.workspaceId, input, context.interactionId);

    if (intent === "yes") {
        // Create the order with collected details
        if (_orderCreator && context.workspaceId) {
            try {
                await _orderCreator({
                    workspaceId: context.workspaceId,
                    interactionId: context.interactionId || "",
                    customerId: context.customerId || null,
                    customerName: context.customerName || "Unknown",
                    customerPlatformId: context.customerPlatformId || "",
                    customerMessage: `Product Order Info: ${context.orderDetails}`,
                    type: "order",
                });
            } catch (err) {
                console.error("[StateMachine] Order creation failed:", err);
            }
        }

        return {
            nextState: "IDLE",
            reply: `📝 I've shared your request with the team!\n\n🛍️ **Items**: ${context.orderDetails}\n\nThey will confirm your order shortly. Thank you!`,
            contextUpdates: clearContext(),
            action: "create_order",
        };
    }

    if (intent === "no") {
        return {
            nextState: "IDLE",
            reply: "No problem, I've cancelled the order. Let me know if you need anything else!",
            contextUpdates: clearContext(),
        };
    }

    return {
        nextState: "CONFIRMING_ORDER",
        reply: "I didn't quite catch that. Shall I submit this order to the team? (Reply 'yes' to confirm or 'no' to cancel)"
    };
}

// ── Appointment / Booking Flow ──────────────────────────────────────────────

async function handleCollectingService(input: string, context: StateContext): Promise<StateTransitionResult> {
    if (input.toLowerCase() === "cancel") {
        return { nextState: "IDLE", reply: "No problem, I've cancelled the booking. Let me know if you need anything else!", contextUpdates: clearContext() };
    }

    return {
        nextState: "COLLECTING_BOOKING_TIME",
        reply: `Great — ${input}! When would you prefer your appointment? (e.g., "Tomorrow at 2pm", "Next Monday morning")`,
        contextUpdates: { serviceType: input },
    };
}

async function handleCollectingBookingTime(input: string, context: StateContext): Promise<StateTransitionResult> {
    if (input.toLowerCase() === "cancel") {
        return { nextState: "IDLE", reply: "Okay, I've cancelled the booking process.", contextUpdates: clearContext() };
    }

    const service = context.serviceType || "your service";
    return {
        nextState: "CONFIRMING_BOOKING",
        reply: `Got it! Here's what I have:\n\n📅 **Service**: ${service}\n⏰ **Time**: ${input}\n\nShall I go ahead and book this? (Reply 'yes' to confirm or 'no' to cancel)`,
        contextUpdates: { preferredTime: input },
    };
}

async function handleConfirmingBooking(input: string, context: StateContext): Promise<StateTransitionResult> {
    const intent = await detectIntent(context.workspaceId, input, context.interactionId);

    if (intent === "yes") {
        // Create the order with collected details
        if (_orderCreator && context.workspaceId) {
            try {
                await _orderCreator({
                    workspaceId: context.workspaceId,
                    interactionId: context.interactionId || "",
                    customerId: context.customerId || null,
                    customerName: context.customerName || "Unknown",
                    customerPlatformId: context.customerPlatformId || "",
                    customerMessage: `${context.serviceType} — ${context.preferredTime}`,
                    type: "appointment",
                    serviceType: context.serviceType,
                    preferredTime: context.preferredTime,
                });
            } catch (err) {
                console.error("[StateMachine] Order creation failed:", err);
            }
        }

        return {
            nextState: "IDLE",
            reply: `📝 I've shared your request with the team!\n\n📅 **Service**: ${context.serviceType}\n⏰ **Time**: ${context.preferredTime}\n\nThey will confirm your appointment shortly. Thank you!`,
            contextUpdates: clearContext(),
            action: "create_order",
        };
    }

    if (intent === "no") {
        return {
            nextState: "IDLE",
            reply: "No problem, I've cancelled the booking. Let me know if you need anything else!",
            contextUpdates: clearContext(),
        };
    }

    return {
        nextState: "CONFIRMING_BOOKING",
        reply: "I didn't quite catch that. Shall I go ahead and book this? (Reply 'yes' to confirm or 'no' to cancel)"
    };
}

// ── Call Request Flow ───────────────────────────────────────────────────────

async function handleCollectingPhone(input: string, context: StateContext): Promise<StateTransitionResult> {
    if (input.toLowerCase() === "cancel") {
        return { nextState: "IDLE", reply: "Okay, cancelled. Let me know if you need anything!", contextUpdates: clearContext() };
    }

    // Basic phone validation — accept digits, spaces, dashes, plus sign
    const cleaned = input.replace(/[\s\-()]/g, "");
    if (!/^\+?\d{7,15}$/.test(cleaned)) {
        return {
            nextState: "COLLECTING_PHONE",
            reply: "That doesn't look like a valid phone number. Please enter your number (e.g., 9812345678) or type 'cancel' to exit.",
        };
    }

    return {
        nextState: "COLLECTING_CALL_TIME",
        reply: `Got it — ${input}. When would be a good time for us to call? (e.g., "After 3pm", "Tomorrow morning")`,
        contextUpdates: { phoneNumber: cleaned },
    };
}

async function handleCollectingCallTime(input: string, context: StateContext): Promise<StateTransitionResult> {
    if (input.toLowerCase() === "cancel") {
        return { nextState: "IDLE", reply: "Okay, cancelled.", contextUpdates: clearContext() };
    }

    return {
        nextState: "CONFIRMING_CALL",
        reply: `Here's what I have:\n\n📞 **Phone**: ${context.phoneNumber}\n⏰ **Best time**: ${input}\n\nShall I request the call? (Reply 'yes' to confirm or 'no' to cancel)`,
        contextUpdates: { preferredTime: input },
    };
}

async function handleConfirmingCall(input: string, context: StateContext): Promise<StateTransitionResult> {
    const intent = await detectIntent(context.workspaceId, input, context.interactionId);

    if (intent === "yes") {
        // Create the call request with collected details
        if (_orderCreator && context.workspaceId) {
            try {
                await _orderCreator({
                    workspaceId: context.workspaceId,
                    interactionId: context.interactionId || "",
                    customerId: context.customerId || null,
                    customerName: context.customerName || "Unknown",
                    customerPlatformId: context.customerPlatformId || "",
                    customerMessage: `Call request: ${context.phoneNumber} — ${context.preferredTime}`,
                    type: "call_request",
                    phoneNumber: context.phoneNumber,
                    preferredTime: context.preferredTime,
                });
            } catch (err) {
                console.error("[StateMachine] Call request creation failed:", err);
            }
        }

        return {
            nextState: "IDLE",
            reply: `📝 I've shared your request with the team!\n\n📞 **Phone**: ${context.phoneNumber}\n⏰ **Time**: ${context.preferredTime}\n\nThey will confirm your request shortly. Thank you!`,
            contextUpdates: clearContext(),
            action: "create_order",
        };
    }

    if (intent === "no") {
        return {
            nextState: "IDLE",
            reply: "No problem, cancelled. Let me know if you need anything!",
            contextUpdates: clearContext(),
        };
    }

    return {
        nextState: "CONFIRMING_CALL",
        reply: "I didn't quite catch that. Shall I request the call? (Reply 'yes' to confirm or 'no' to cancel)"
    };
}

// ── Negotiation Flow ────────────────────────────────────────────────────────

async function handleAwaitingProposalResponse(input: string, context: StateContext): Promise<StateTransitionResult> {
    const lower = input.toLowerCase();

    // Check if customer explicitly confirms the seller's new proposal
    if (lower.includes("yes") || lower.includes("confirm") || lower.includes("sure") || lower.includes("ok") || lower.includes("perfect") || lower.includes("fine")) {
        if (context.workspaceId && context.orderId) {
            try {
                const { orders } = await import("@ebizmate/db");
                await db.update(orders).set({
                    status: "confirmed",
                    customerNote: "Customer accepted seller proposal",
                    confirmedAt: new Date(),
                    updatedAt: new Date(),
                }).where(eq(orders.id, context.orderId));

                return {
                    nextState: "IDLE",
                    reply: `✅ Great! I've confirmed that with the team. Your request is finalized based on their proposal: "${context.proposal}".`,
                    contextUpdates: clearContext(),
                };
            } catch (err) {
                console.error("[StateMachine] Failed to confirm proposal:", err);
            }
        }
    }

    // If customer explicitly cancels or says no
    if (lower.includes("no") || lower.includes("cancel") || lower.includes("nevermind")) {
        if (context.workspaceId && context.orderId) {
            try {
                const { orders } = await import("@ebizmate/db");
                await db.update(orders).set({
                    status: "cancelled",
                    customerNote: "Customer rejected seller proposal",
                    updatedAt: new Date(),
                }).where(eq(orders.id, context.orderId));
            } catch (err) { }
        }
        return {
            nextState: "IDLE",
            reply: "No problem, I've cancelled the request since the new proposal didn't work for you. Let me know if you need anything else!",
            contextUpdates: clearContext(),
        };
    }

    // If ambiguous, ask again
    return {
        nextState: "AWAITING_PROPOSAL_RESPONSE",
        reply: `Please reply 'yes' to accept the team's proposal ("${context.proposal}"), or 'no' to cancel the request.`,
    };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearContext(): Partial<StateContext> {
    return {
        collectionType: undefined,
        orderDetails: undefined,
        serviceType: undefined,
        preferredTime: undefined,
        phoneNumber: undefined,
        orderId: undefined,
        proposal: undefined,
        address: undefined,
        tempOrderId: undefined,
        bookingDate: undefined,
        pendingOrder: undefined,
        workspaceId: undefined,
        interactionId: undefined,
        customerName: undefined,
        customerPlatformId: undefined,
        customerId: undefined,
        customerMessage: undefined,
    };
}

// ── Main State Machine Runner ───────────────────────────────────────────────

export async function processStateMachine(
    customerId: string,
    currentState: ConversationState,
    currentContext: StateContext,
    input: string
): Promise<{ reply: string | null; newState: ConversationState }> {

    let result: StateTransitionResult | null = null;

    // Universal cancel from any non-IDLE state
    if (input.toLowerCase() === "cancel" && currentState !== "IDLE" && currentState !== "HUMAN_TAKEOVER") {
        result = { nextState: "IDLE", reply: "Okay, cancelled. How can I help you?", contextUpdates: clearContext() };
    }

    if (!result) {
        switch (currentState) {
            case "IDLE":
                result = await handleIdle(input);
                break;
            case "AWAITING_ORDER_ID":
                result = await handleAwaitingOrderId(input, currentContext);
                break;
            // Product Order flow
            case "COLLECTING_ORDER":
                result = await handleCollectingOrder(input, currentContext);
                break;
            case "CONFIRMING_ORDER":
                result = await handleConfirmingOrder(input, currentContext);
                break;
            // Appointment flow
            case "COLLECTING_SERVICE":
                result = await handleCollectingService(input, currentContext);
                break;
            case "COLLECTING_BOOKING_TIME":
                result = await handleCollectingBookingTime(input, currentContext);
                break;
            case "CONFIRMING_BOOKING":
                result = await handleConfirmingBooking(input, currentContext);
                break;
            // Call request flow
            case "COLLECTING_PHONE":
                result = await handleCollectingPhone(input, currentContext);
                break;
            case "COLLECTING_CALL_TIME":
                result = await handleCollectingCallTime(input, currentContext);
                break;
            case "CONFIRMING_CALL":
                result = await handleConfirmingCall(input, currentContext);
                break;
            case "AWAITING_PROPOSAL_RESPONSE":
                result = await handleAwaitingProposalResponse(input, currentContext);
                break;
            case "HUMAN_TAKEOVER":
                return { reply: null, newState: "HUMAN_TAKEOVER" };
            default:
                result = { nextState: "IDLE", reply: "Let's start over. How can I help?", contextUpdates: clearContext() };
        }
    }

    if (result) {
        await db.update(customers)
            .set({
                conversationState: result.nextState,
                conversationContext: { ...currentContext, ...result.contextUpdates },
                updatedAt: new Date(),
                aiPaused: result.action === "escalate" ? true : undefined,
            })
            .where(eq(customers.id, customerId));

        return { reply: result.reply, newState: result.nextState };
    }

    return { reply: null, newState: currentState };
}
