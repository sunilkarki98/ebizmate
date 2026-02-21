import { GoogleGenAI } from "@google/genai";
import { AIProvider, ChatParams, ChatResult, EmbedResult } from "../../../common/types/ai";

export class GeminiProvider implements AIProvider {
    readonly name = "gemini" as const;
    private client: GoogleGenAI;
    private model: string;

    constructor(apiKey: string, model: string) {
        this.client = new GoogleGenAI({ apiKey });
        this.model = model;
    }

    async chat(params: ChatParams): Promise<ChatResult> {
        const contents: Record<string, unknown>[] = [];

        // 1. History
        if (params.history && params.history.length > 0) {
            const mappedHistory = params.history.map(h => ({
                role: h.role === "assistant" ? "model" : h.role === "system" ? "user" : "user", // Gemini uses 'model' instead of 'assistant' and 'system' is sent as instruction
                parts: [{ text: h.content }]
            }));
            contents.push(...mappedHistory);
        }

        // 2. Current User Message
        if (typeof params.userMessage === "string") {
            contents.push({ role: "user", parts: [{ text: params.userMessage }] });
        } else if (Array.isArray(params.userMessage)) {
            const parts = params.userMessage.map(part => {
                if (part.type === "text") {
                    return { text: part.text };
                } else if (part.type === "image_url" && 'url' in part.image_url) {
                    const match = part.image_url.url.match(/^data:(.*?);base64,(.*)$/);
                    if (match) {
                        return {
                            inlineData: {
                                mimeType: match[1],
                                data: match[2]
                            }
                        };
                    }
                    return { text: "" }; // skip invalid
                }
                return { text: "" };
            });
            contents.push({ role: "user", parts });
        }

        let geminiTools: Record<string, unknown>[] | undefined = undefined;
        if (params.tools && params.tools.length > 0) {
            geminiTools = [{
                functionDeclarations: params.tools.map(t => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters // Note: Gemini natively uses OpenAPI 3.0 schema which usually matches standard JSONSchema
                }))
            }];
        }

        const response = await this.client.models.generateContent({
            model: this.model,
            contents: contents as any[], // Package requires specific internal type cast here occasionally but `any` is restricted by ESLint. Wait to see if package accepts Record<string,unknown>.
            config: {
                tools: geminiTools as any,
                systemInstruction: params.systemPrompt,
                temperature: params.temperature ?? 0.7,
                maxOutputTokens: params.maxTokens ?? 1024,
                topP: params.topP ?? 1.0,
            },
        });

        const text = response.text ?? "";
        const usage = response.usageMetadata;

        let toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> | undefined = undefined;
        if (response.functionCalls && response.functionCalls.length > 0) {
            toolCalls = response.functionCalls.map(fc => ({
                id: `call_${Math.random().toString(36).substring(7)}`, // Gemini doesn't always provide an ID, so we generate a random one if needed
                name: fc.name || "unknown",
                arguments: (fc.args as Record<string, unknown>) || {}
            }));
        }

        return {
            content: text,
            toolCalls,
            usage: {
                promptTokens: usage?.promptTokenCount ?? 0,
                completionTokens: usage?.candidatesTokenCount ?? 0,
                totalTokens: usage?.totalTokenCount ?? 0,
            },
            model: this.model,
        };
    }

    async embed(text: string, userId?: string): Promise<EmbedResult> {
        const response = await this.client.models.embedContent({
            model: "text-embedding-004",
            contents: text,
            config: {
                outputDimensionality: 768, // Native dimension — matches DB schema
            },
        });

        const embedding = response.embeddings?.[0]?.values ?? [];

        return {
            embedding,
        };
    }
}
