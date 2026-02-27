import { randomUUID } from "node:crypto";

/**
 * mock-webhook.ts
 * 
 * Usage:
 * npx tsx packages/domain/src/scripts/mock-webhook.ts --platform=instagram --message="How much does this cost?"
 * 
 * This specifically tests the entire pipeline BEFORE Meta API approval:
 * 1. Sends payload to local Next.js Edge Webhook API
 * 2. Next.js validates and forwards to NestJS internal webhook route
 * 3. NestJS creates a job in BullMQ
 * 4. AI Orchestrator picks up the job, retrieves the RAG knowledge, and generates a reply.
 */

async function run() {
    console.log("🚀 Starting Webhook Mock Script...");

    const args = process.argv.slice(2);
    const platformArg = args.find(a => a.startsWith("--platform="))?.split("=")[1] || "instagram";
    const messageArg = args.find(a => a.startsWith("--message="))?.split("=")[1] || "What is your pricing?";

    // 1. Create a fake Instagram payload conforming to expected schemas
    // This matches the format expected by our `webhookBodySchema`
    const payload = {
        type: "message",
        platform: platformArg,
        payload: {
            messageId: `mid_${randomUUID()}`,
            timestamp: new Date().toISOString(),
            senderId: "test_user_123456",
            text: messageArg,
            isEcho: false
        }
    };

    const webhookUrl = "http://localhost:3000/api/webhook/" + platformArg;

    console.log(`📡 Sending mock payload to ${webhookUrl}`);
    console.log(`💬 Message: "${messageArg}"\n`);

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("❌ Next.js Edge rejected the webhook:", err);
            process.exit(1);
        }

        const data = await response.json();
        console.log("✅ Next.js Edge accepted the webhook:", data);
        console.log("\n⏳ Watch your NestJS api console to see the job being processed by the AI Orchestrator!");

    } catch (error) {
        console.error("❌ Network error sending webhook:", error);
    }
}

run().catch(console.error);
