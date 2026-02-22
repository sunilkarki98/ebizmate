"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqProvider = void 0;
const openai_1 = __importDefault(require("openai"));
class GroqProvider {
    name = "groq";
    client;
    model;
    constructor(apiKey, model) {
        this.client = new openai_1.default({
            baseURL: "https://api.groq.com/openai/v1",
            apiKey,
            timeout: 30_000,
            maxRetries: 0
        });
        this.model = model;
    }
    async chat(params) {
        const messages = [
            { role: "system", content: params.systemPrompt }
        ];
        if (params.history && params.history.length > 0) {
            messages.push(...params.history);
        }
        if (typeof params.userMessage === "string") {
            messages.push({ role: "user", content: params.userMessage });
        }
        else {
            // Groq may not support multimodal yet, but we pass it typed as unknown or standard chat completion
            messages.push({ role: "user", content: params.userMessage });
        }
        const response = await this.client.chat.completions.create({
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
            user: params.userId,
        });
        const choice = response.choices[0];
        const toolCalls = choice?.message?.tool_calls
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
        if (!choice?.message?.content && !toolCalls?.length) {
            throw new Error("Groq returned empty content and no tool calls");
        }
        return {
            content: choice?.message?.content || "",
            toolCalls: toolCalls?.length ? toolCalls : undefined,
            usage: {
                promptTokens: response.usage?.prompt_tokens ?? 0,
                completionTokens: response.usage?.completion_tokens ?? 0,
                totalTokens: response.usage?.total_tokens ?? 0,
            },
            model: response.model,
        };
    }
    async embed(text) {
        throw new Error("Embeddings via Groq are not currently supported. Ensure the global embedding model is configured correctly.");
    }
}
exports.GroqProvider = GroqProvider;
//# sourceMappingURL=groq.js.map