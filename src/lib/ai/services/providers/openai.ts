import OpenAI from "openai";
import { AIProvider, ChatParams, ChatResult, EmbedResult } from "@/types/ai";

export class OpenAIProvider implements AIProvider {
    readonly name = "openai" as const;
    private client: OpenAI;
    private model: string;
    private embeddingModel: string;

    constructor(apiKey: string, model: string, embeddingModel: string) {
        this.client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 0 });
        this.model = model;
        this.embeddingModel = embeddingModel;
    }

    async chat(params: ChatParams): Promise<ChatResult> {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: params.systemPrompt }
        ];

        if (params.history && params.history.length > 0) {
            messages.push(...params.history as OpenAI.Chat.ChatCompletionMessageParam[]);
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
                    parameters: t.parameters as Record<string, unknown>
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
                let args: Record<string, unknown> = {};
                try { args = JSON.parse(fn.arguments); } catch (e) { console.error("Failed to parse tool args", e); }
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

    async embed(text: string): Promise<EmbedResult> {
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
