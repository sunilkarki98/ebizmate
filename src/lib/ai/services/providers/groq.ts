import OpenAI from "openai";
import { AIProvider, ChatParams, ChatResult, EmbedResult } from "@/types/ai";

export class GroqProvider implements AIProvider {
    readonly name = "groq" as const;
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, model: string) {
        this.client = new OpenAI({
            baseURL: "https://api.groq.com/openai/v1",
            apiKey,
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
            // Groq may not support multimodal yet, but we pass it typed as unknown or standard chat completion
            messages.push({ role: "user", content: params.userMessage as unknown as string });
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

    async embed(text: string): Promise<EmbedResult> {
        throw new Error("Embeddings via Groq are not currently supported. Ensure the global embedding model is configured correctly.");
    }
}
