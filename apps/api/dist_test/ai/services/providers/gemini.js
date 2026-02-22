"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
class GeminiProvider {
    name = "gemini";
    client = null;
    apiKey;
    model;
    constructor(apiKey, model) {
        this.apiKey = apiKey;
        this.model = model;
    }
    async getClient() {
        if (!this.client) {
            const { GoogleGenAI } = await Promise.resolve().then(() => __importStar(require("@google/genai")));
            this.client = new GoogleGenAI({ apiKey: this.apiKey });
        }
        return this.client;
    }
    async chat(params) {
        const client = await this.getClient();
        const contents = [];
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
        }
        else if (Array.isArray(params.userMessage)) {
            const parts = params.userMessage.map(part => {
                if (part.type === "text") {
                    return { text: part.text };
                }
                else if (part.type === "image_url" && 'url' in part.image_url) {
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
        let geminiTools = undefined;
        if (params.tools && params.tools.length > 0) {
            geminiTools = [{
                    functionDeclarations: params.tools.map(t => ({
                        name: t.name,
                        description: t.description,
                        parameters: t.parameters // Note: Gemini natively uses OpenAPI 3.0 schema which usually matches standard JSONSchema
                    }))
                }];
        }
        const response = await client.models.generateContent({
            model: this.model,
            contents: contents, // Package requires specific internal type cast here occasionally but `any` is restricted by ESLint. Wait to see if package accepts Record<string,unknown>.
            config: {
                tools: geminiTools,
                systemInstruction: params.systemPrompt,
                temperature: params.temperature ?? 0.7,
                maxOutputTokens: params.maxTokens ?? 1024,
                topP: params.topP ?? 1.0,
            },
        });
        const text = response.text ?? "";
        const usage = response.usageMetadata;
        let toolCalls = undefined;
        if (response.functionCalls && response.functionCalls.length > 0) {
            toolCalls = response.functionCalls.map(fc => ({
                id: `call_${Math.random().toString(36).substring(7)}`, // Gemini doesn't always provide an ID, so we generate a random one if needed
                name: fc.name || "unknown",
                arguments: fc.args || {}
            }));
        }
        const result = {
            content: text,
            usage: {
                promptTokens: usage?.promptTokenCount ?? 0,
                completionTokens: usage?.candidatesTokenCount ?? 0,
                totalTokens: usage?.totalTokenCount ?? 0,
            },
            model: this.model,
        };
        if (toolCalls && toolCalls.length > 0)
            result.toolCalls = toolCalls;
        return result;
    }
    async embed(text, userId) {
        const client = await this.getClient();
        const response = await client.models.embedContent({
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
exports.GeminiProvider = GeminiProvider;
//# sourceMappingURL=gemini.js.map