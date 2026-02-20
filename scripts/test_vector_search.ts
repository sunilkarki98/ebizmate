import "dotenv/config";
import { db } from "@/lib/db";
import { items, interactions } from "@/db/schema";
import { processInteraction } from "@/lib/ai/customer/processor";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

async function main() {
    console.log("--- Testing Vector Search ---");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error("❌ OPENAI_API_KEY is not set in .env. Cannot run vector search test.");
        console.log("Add this to your .env file:");
        console.log("OPENAI_API_KEY=sk-your-key-here");
        process.exit(1);
    }

    const workspaceId = "test-workspace-dm";
    const itemName = "Opening Hours";
    const itemContent = "We are open from 9 AM to 5 PM, Monday to Friday.";

    // 1. Generate Embedding for Item
    console.log("1. Generating embedding for item...");
    const openai = new OpenAI({ apiKey });
    const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: `${itemName}: ${itemContent}`,
    });
    const embedding = embeddingResponse.data[0].embedding;

    // 2. Insert Item with Embedding
    const [item] = await db.insert(items).values({
        workspaceId,
        name: itemName,
        content: itemContent,
        embedding,
    }).returning();
    console.log(`   - Item inserted: ${item.id}`);

    // 3. Create Interaction (Semantic Match, no keyword overlap)
    const userQuery = "When do you start working?";
    const [interaction] = await db.insert(interactions).values({
        workspaceId,
        sourceId: "test-vector-search",
        externalId: `vec-test-${Date.now()}`,
        authorId: "user-vector-test",
        authorName: "Vector Tester",
        content: userQuery,
        status: "PENDING",
    }).returning();

    console.log(`2. Processing interaction: "${userQuery}"`);

    // 4. Process with AI
    const reply = await processInteraction(interaction.id);
    console.log("\n--- AI Reply ---");
    console.log(reply);
    console.log("----------------");

    // 5. Verify
    if (reply.toLowerCase().includes("9") || reply.toLowerCase().includes("am") || reply.toLowerCase().includes("monday")) {
        console.log("✅ Vector Search SUCCESS: AI found opening hours despite no keyword match.");
    } else {
        console.log("⚠️  Vector Search: AI replied but may not have found the item. Review reply above.");
    }

    // Cleanup
    await db.delete(items).where(eq(items.id, item.id));
    await db.delete(interactions).where(eq(interactions.id, interaction.id));
    console.log("Cleanup done.");
}

main().catch(console.error).then(() => process.exit(0));
