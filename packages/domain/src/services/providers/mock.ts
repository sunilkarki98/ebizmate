import { AIProvider, ChatParams, ChatResult, EmbedResult } from "@ebizmate/contracts";

/**
 * Mock AI provider for testing and development.
 * Returns configurable responses without making any API calls.
 */
export class MockProvider implements AIProvider {
    readonly name = "mock" as const;

    async chat(params: ChatParams): Promise<ChatResult> {
        let preview = "";
        let inputLength = 0;

        if (typeof params.userMessage === "string") {
            preview = params.userMessage.slice(0, 50);
            inputLength = params.userMessage.length;
        } else {
            // Handle array content
            const textParts = params.userMessage
                .filter(p => p.type === "text")
                .map(p => {
                    if ("text" in p && typeof p.text === "string") return p.text;
                    return "";
                })
                .join(" ");
            preview = textParts.slice(0, 50) || "[Image Content]";
            inputLength = JSON.stringify(params.userMessage).length;
        }

        if (params.history) {
            inputLength += JSON.stringify(params.history).length;
        }

        let toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> | undefined = undefined;
        let mockResponse = process.env.MOCK_AI_RESPONSE || `Mock response to: "${preview}..."`;

        // If tools are provided and we want to mock a tool call
        if (params.tools && params.tools.length > 0) {
            // Either specifically requested via env, or default to testing the first tool
            if (process.env.MOCK_TOOL_CALL !== "false") {
                const tool = params.tools[0];
                toolCalls = [{
                    id: `mock_call_${Math.random().toString(36).substring(7)}`,
                    name: tool.name,
                    arguments: { mockArg: "mockValue" } // Simple mock arguments
                }];
                mockResponse = ""; // Usually content is empty when tools are called
            }
        }

        return {
            content: mockResponse,
            toolCalls,
            usage: {
                promptTokens: params.systemPrompt.length + inputLength,
                completionTokens: mockResponse.length,
                totalTokens: params.systemPrompt.length + inputLength + mockResponse.length,
            },
            model: "mock-model",
        };
    }

    async embed(text: string): Promise<EmbedResult> {
        // Generate a deterministic fake embedding based on input hash
        const embedding = new Array(768).fill(0).map((_, i) => {
            const hash = simpleHash(text + i);
            return (hash % 1000) / 1000 - 0.5; // Values between -0.5 and 0.5
        });

        return {
            embedding,
        };
    }
}

function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}
