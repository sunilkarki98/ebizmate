import { getEnv } from "../src/lib/env";
import { OpenRouterProvider } from "../src/lib/ai/services/providers/openrouter";

async function runTest() {
    console.log("=== Testing OpenRouter Integration ===");

    const env = getEnv();

    if (!env.OPENROUTER_API_KEY) {
        console.error("No OpenRouter API key found in env.");
        return;
    }

    const ai = new OpenRouterProvider(env.OPENROUTER_API_KEY, "meta-llama/llama-3.3-70b-instruct");

    try {
        const result = await ai.chat({
            systemPrompt: "You are a helpful AI assistant. Always match the user's tone.",
            userMessage: "Hey friend, how's it going? Can you tell me a joke?",
            temperature: 0.9,
            maxTokens: 100,
        });

        console.log("\n✅ OpenRouter responded successfully!");
        console.log(`Model Used: ${result.model}`);
        console.log(`Usage: ${JSON.stringify(result.usage)}`);
        console.log(`\nResponse:\n${result.content}`);

    } catch (err: any) {
        console.error("\n❌ OpenRouter Chat failed:", err.message || err);
    }
}

runTest().then(() => process.exit(0)).catch(() => process.exit(1));
