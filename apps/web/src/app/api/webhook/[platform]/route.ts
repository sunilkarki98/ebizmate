
import { headers } from "next/headers";
import { NextResponse, after } from "next/server";
import { webhookBodySchema } from "@/lib/validation";
import crypto from "crypto";

// --- Webhook Signature Verification ---

function verifySignature(payload: string, signature: string | null, secret: string): boolean {
    if (!signature || !secret) return false;
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const expected = hmac.digest("hex");
    // Timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false; // Different lengths
    }
}

// --- GET: Webhook Verification (TikTok/Instagram Challenge) ---

export async function GET(req: Request) {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("challenge") || url.searchParams.get("hub.challenge");
    const verifyToken = url.searchParams.get("verify_token") || url.searchParams.get("hub.verify_token");

    const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN;

    if (challenge && verifyToken && expectedToken && verifyToken === expectedToken) {
        // Return the challenge to verify the webhook URL
        return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// --- POST: Handle Incoming Webhook Events ---

export async function POST(req: Request, { params }: { params: Promise<{ platform: string }> }) {
    const rawBody = await req.text();
    const { platform } = await params;

    // 1. Signature Verification (mandatory in production)
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret && process.env.NODE_ENV === "production") {
        console.error("WEBHOOK_SECRET is not set — rejecting all webhooks in production");
        return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    if (webhookSecret) {
        const headersList = await headers();
        const signature =
            headersList.get("x-signature") ||
            headersList.get("x-hub-signature-256") ||
            headersList.get("x-tiktok-signature");

        if (!verifySignature(rawBody, signature, webhookSecret)) {
            console.warn(`Webhook signature verification failed for ${platform}`);
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
    }

    // 2. Parse and validate body
    let body: Record<string, unknown>;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = webhookBodySchema.safeParse(body);
    if (!parsed.success) {
        console.warn("Webhook body validation failed:", parsed.error.issues);
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const validatedBody = parsed.data;

    console.log(`Received ${platform} webhook:`, validatedBody.type || "unknown");

    // Push the validated payload securely to the NestJS API
    after(async () => {
        try {
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const internalSecret = process.env.INTERNAL_API_SECRET;
            if (!internalSecret) {
                console.error("INTERNAL_API_SECRET is not set — cannot forward webhook to backend");
                return;
            }
            const response = await fetch(`${backendUrl}/webhook/internal/${platform}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${internalSecret}`
                },
                body: JSON.stringify(validatedBody)
            });

            if (!response.ok) {
                console.error(`NestJS webhook processing failed for ${platform}:`, await response.text());
            }
        } catch (err) {
            console.error(`Failed to push webhook to backend for ${platform}:`, err);
        }
    });

    return NextResponse.json({ success: true, type: validatedBody.type || "unknown" });
}
