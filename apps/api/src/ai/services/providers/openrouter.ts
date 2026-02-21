import OpenAI from "openai";
import { AIProvider, ChatParams, ChatResult, EmbedResult } from "../../../common/types/ai";

export class OpenRouterProvider implements AIProvider {
    readonly name = "openrouter" as const;
    private client: OpenAI;
    private model: string;
    // Note: OpenRouter doesn't natively host embedding models, they usually delegate to OpenAI/Together.
    // For embeddings, we'll still throw an error or handle it gracefully, but chat is fully supported.

    constructor(apiKey: string, model: string) {
        this.client = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey,
            defaultHeaders: {
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "X-Title": "EbizMate AI Customer Agent",
            },
            timeout: 30_000,
            maxRetries: 0
        });
        this.model = model;
    }

    async chat(params: ChatParams): Promise<ChatResult> {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: params.systemPrompt }
        ];

        if (params.history && params.history.length > 0) {
            messages.push(...params.history as OpenAI.Chat.ChatCompletionMessageParam[]);
        }

        if (typeof params.userMessage === "string") {
            messages.push({ role: "user", content: params.userMessage });
        } else {
            messages.push({ role: "user", content: params.userMessage as unknown as string }); // Types cast for OpenAI schema
        }

        const response = await this.client.chat.completions.create({
            model: this.model,
            messages,
            tools: params.tools ? params.tools.map(t => ({
                type: "function",
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters as Record<string, unknown>
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
                let args: Record<string, unknown> = {};
                try { args = JSON.parse(fn.arguments); } catch (e) { console.error("Failed to parse tool args", e); }
                return {
                    id: tc.id,
                    name: fn.name,
                    arguments: args
                };
            });

        if (!choice?.message?.content && !toolCalls?.length) {
            throw new Error("OpenRouter returned empty content and no tool calls");
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

    async embed(text: string): Promise<EmbedResult> {
        // OpenRouter doesn't currently provide generic embedding models directly in the same way OpenAI does,
        // (though they pass-through some text-embedding-ada-002, etc).
        // Since the factory uses the OpenAI Embedding model for vector search globally, we can just throw here
        // and let the factory route embeddings through OpenAI while OpenRouter handles chat.
        throw new Error("Embeddings via OpenRouter are not currently supported. Ensure the global embedding model is configured correctly.");
    }
}
