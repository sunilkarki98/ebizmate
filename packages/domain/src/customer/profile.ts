import { db } from "@ebizmate/db";
import { customers, interactions } from "@ebizmate/db";
import { eq, desc } from "drizzle-orm";
import { getAIService } from "../services/factory.js";

/**
 * Asynchronously summarizes a customer's conversation history 
 * to generate a Long-Term Memory (preferences summary).
 */
export async function summarizeCustomerProfile(workspaceId: string, customerId: string): Promise<void> {
    try {
        const customer = await db.query.customers.findFirst({
            where: eq(customers.id, customerId)
        });

        if (!customer) return;

        // Fetch the last 20 interactions for this customer
        const past = await db.select()
            .from(interactions)
            .where(eq(interactions.customerId, customerId))
            .orderBy(desc(interactions.createdAt))
            .limit(20);

        if (past.length < 3) {
            // Not enough data to summarize meaningfully yet
            return;
        }

        const historyTokens = past.reverse().map(ix => {
            let txt = `Customer: ${ix.content}`;
            if (ix.response) txt += `\nAssistant: ${ix.response}`;
            return txt;
        }).join("\n\n");

        const ai = await getAIService(workspaceId, "coach"); // Use coach to save credits, it's typically a cheaper model like 4o-mini

        const systemPrompt = `You are a Long-Term Memory summarizer for an e-commerce platform.
Your job is to update the customer's existing profile summary using the recent conversation history. Keep it highly dense and bulleted, focusing on PREFERENCES, INTENTS, and IDENTIFYING FACTS.
Focus on:
- Items they have ordered or asked about
- Their sizes, preferred colors, or styles
- Any complaints, recurring issues, or specific needs (e.g. "needs fast shipping")
- Any prior context that would be helpful for the AI to "remember" them next time.

CURRENT SUMMARY MEMORY:
${customer.preferencesSummary || "No existing memory."}

INSTRUCTIONS:
Refine and update the current memory using the new conversation history below. Keep the final output to 3-5 short bullet points. NEVER invent facts. If nothing notable is found in the new history, return the previous summary.`;

        const response = await ai.chat({
            systemPrompt,
            userMessage: `Here is the conversation history:\n\n${historyTokens}`,
            temperature: 0.1,
            maxTokens: 200,
            // L-2 FIX: Use 'coach_chat' instead of 'chat' to avoid inflating chat usage metrics
        }, undefined, "coach_chat");

        const newSummary = response.content.trim();

        await db.update(customers).set({
            preferencesSummary: newSummary,
            updatedAt: new Date(),
        }).where(eq(customers.id, customerId));

        console.log(`[ProfileSummarizer] Generated memory for customer ${customerId}`);

    } catch (err) {
        console.error(`[ProfileSummarizer] Failed to summarize customer ${customerId}:`, err);
    }
}
