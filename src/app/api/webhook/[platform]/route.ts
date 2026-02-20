
import { headers } from "next/headers";
import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { interactions, workspaces, posts, customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { processInteraction } from "@/lib/ai/customer/processor";
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

    // 1. Signature Verification
    const webhookSecret = process.env.WEBHOOK_SECRET;
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

    // 3. Identify Workspace
    const platformUserId = validatedBody.userId || validatedBody.sec_uid || validatedBody.authorId;
    if (!platformUserId) {
        return NextResponse.json({ error: "Missing user ID in webhook" }, { status: 400 });
    }

    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.platformId, platformUserId),
    });

    if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 200 });
    }

    // 4. Handle Event Types
    const eventType = validatedBody.type;

    if (eventType === "video.publish" || eventType === "post.create" || eventType === "media.create") {
        // --- Proactive Indexing ---
        const videoId = validatedBody.video_id || validatedBody.item_id || validatedBody.post_id;
        const caption = validatedBody.description || validatedBody.caption || validatedBody.text || "";

        if (videoId) {
            await db.insert(posts).values({
                workspaceId: workspace.id,
                platformId: videoId,
                content: caption,
                meta: validatedBody,
            }).onConflictDoUpdate({
                target: posts.platformId,
                set: { content: caption, updatedAt: new Date() }
            });
            console.log(`Indexed content: ${videoId}`);
        }
        return NextResponse.json({ success: true, type: "content_indexed" });

    } else if (eventType === "comment.create" || eventType === "message.create") {
        // --- Interaction Handling ---

        // Find parent post context — FIXED: scoped to workspace
        const parentId = validatedBody.video_id || validatedBody.post_id;
        let localPostId = null;

        if (parentId) {
            const parentPost = await db.query.posts.findFirst({
                where: and(
                    eq(posts.platformId, parentId),
                    eq(posts.workspaceId, workspace.id) // Tenant isolation fix
                ),
            });
            if (parentPost) {
                localPostId = parentPost.id;
            }
        }

        // --- CRM Data Capture ---
        if (validatedBody.userId) {
            await db.insert(customers).values({
                workspaceId: workspace.id,
                platformId: validatedBody.userId,
                platformHandle: validatedBody.userName || "unknown",
                name: validatedBody.userName || "unknown",
                lastInteractionAt: new Date(),
            }).onConflictDoUpdate({
                target: [customers.workspaceId, customers.platformId],
                set: {
                    platformHandle: validatedBody.userName || undefined,
                    lastInteractionAt: new Date(),
                }
            });
        }

        const externalId = validatedBody.commentId || validatedBody.messageId || `evt-${Date.now()}`;

        // Idempotent insert — skip duplicates via unique constraint
        const result = await db
            .insert(interactions)
            .values({
                workspaceId: workspace.id,
                postId: localPostId,
                sourceId: parentId || "unknown",
                externalId,
                authorId: validatedBody.userId || "anonymous",
                authorName: validatedBody.userName || "User",
                content: validatedBody.text || validatedBody.message || "",
                status: "PENDING",
            })
            .onConflictDoNothing({
                target: [interactions.workspaceId, interactions.externalId],
            })
            .returning();

        if (result.length === 0) {
            // Duplicate event — already processed
            console.log(`Duplicate webhook event skipped: ${externalId}`);
            return NextResponse.json({ success: true, duplicate: true });
        }

        const [interaction] = result;

        // Reliable async AI processing — uses after() to keep serverless function alive
        after(async () => {
            try {
                await processInteraction(interaction.id);
            } catch (err) {
                console.error(`AI processing failed for interaction ${interaction.id}:`, err);
            }
        });

        return NextResponse.json({ success: true, interactionId: interaction.id });
    }

    // Unknown event type — acknowledge but don't process
    return NextResponse.json({ received: true, type: eventType || "unknown" });
}
