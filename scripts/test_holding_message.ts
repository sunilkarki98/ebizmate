import { getAIService } from "../src/lib/ai/services/factory";
import { CUSTOMER_SYSTEM_PROMPT } from "../src/lib/ai/customer/prompts";

async function runTest() {
    console.log("=== Testing AI Holding Messages ===");

    // We will use a mock workspace for this test.
    const { getEnv } = await import("../src/lib/env");
    const { GeminiProvider } = await import("../src/lib/ai/services/providers/gemini");
    const env = getEnv();

    if (!env.GEMINI_API_KEY) {
        console.error("No Gemini API key found in env.");
        return;
    }

    const ai = new GeminiProvider(env.GEMINI_API_KEY, "gemini-1.5-pro");

    const testCases = [
        {
            tone: "Professional & Formal",
            industry: "High-end Electronics",
            name: "ElectroLux",
            question: "Do you have the new Quantum Laptop in stock?"
        },
        {
            tone: "Friendly & Casual",
            industry: "Boutique Clothing",
            name: "StyleHouse",
            question: "Hey! Do you guys have the summer floral dress in size M available?"
        },
        {
            tone: "Gen Z / Trendy",
            industry: "Streetwear",
            name: "HypeDrop",
            question: "yooo is the new neon hoodie dropping today?"
        }
    ];

    for (const test of testCases) {
        console.log(`\n--- Test Case: ${test.tone} ---`);

        const mockWorkspace = {
            name: test.name,
            industry: test.industry,
            toneOfVoice: test.tone,
        } as any;

        // Empty items context because we don't know the answer
        const systemPrompt = CUSTOMER_SYSTEM_PROMPT(
            mockWorkspace,
            "", // No header
            "No relevant items found in knowledge base.", // Empty KB!
            false
        );

        try {
            const result = await ai.chat({
                systemPrompt,
                userMessage: test.question,
                temperature: 0.4
            });

            const reply = result.content;
            console.log(`Customer: "${test.question}"`);
            console.log(`AI Raw Output:\n${reply}`);

            // Simulate the processor's stripping logic
            let finalStatus = "PROCESSED";
            let messageToSend = reply;

            if (reply.includes("ACTION_REQUIRED") || reply.includes("[ACTION_REQUIRED]")) {
                finalStatus = "NEEDS_REVIEW";
                messageToSend = reply.replace(/\[?ACTION_REQUIRED(: ESCALATE)?\]?/g, "").trim();
            }

            console.log(`\nProcessor Result:`);
            console.log(`Status: ${finalStatus}`);
            console.log(`What customer actually sees: "${messageToSend}"`);

        } catch (e) {
            console.error("Chat failed:", e);
        }
    }
}

runTest().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
