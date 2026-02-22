"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIProvider {
    name = "openai";
    client;
    model;
    embeddingModel;
    constructor(apiKey, model, embeddingModel) {
        this.client = new openai_1.default({ apiKey, timeout: 30_000, maxRetries: 0 });
        this.model = model;
        this.embeddingModel = embeddingModel;
    }
    async chat(params) {
        const messages = [
            { role: "system", content: params.systemPrompt }
        ];
        if (params.history && params.history.length > 0) {
            messages.push(...params.history);
        }
        messages.push({ role: "user", content: params.userMessage });
        const completion = await this.client.chat.completions.create({
            model: this.model,
            messages,
            tools: params.tools ? params.tools.map(t => ({
                type: "function",
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters
                }
            })) : undefined,
            temperature: params.temperature ?? 0.7,
            max_tokens: params.maxTokens ?? 1024,
            top_p: params.topP ?? 1.0,
        });
        const choice = completion.choices[0];
        const usage = completion.usage;
        // Safely parse tool arguments from JSON string
        const toolCalls = choice.message.tool_calls
            ?.filter(tc => tc.type === "function")
            .map(tc => {
            const fn = tc.function;
            let args = {};
            try {
                args = JSON.parse(fn.arguments);
            }
            catch (e) {
                console.error("Failed to parse tool args", e);
            }
            return {
                id: tc.id,
                name: fn.name,
                arguments: args
            };
        });
        return {
            content: choice.message.content || "",
            toolCalls: toolCalls?.length ? toolCalls : undefined,
            usage: {
                promptTokens: usage?.prompt_tokens ?? 0,
                completionTokens: usage?.completion_tokens ?? 0,
                totalTokens: usage?.total_tokens ?? 0,
            },
            model: this.model,
        };
    }
    async embed(text) {
        const response = await this.client.embeddings.create({
            model: this.embeddingModel,
            input: text,
            dimensions: 768, // Standardized to 768 for cross-provider compatibility
        });
        return {
            embedding: response.data[0].embedding,
        };
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openai.js.map