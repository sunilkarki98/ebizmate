import type { AISettings, ChatParams, ChatResult, EmbedResult } from "../../common/types/ai";
/**
 * Get an AI service bound to a workspace.
 * Handles provider creation, retry, fallback, and usage logging.
 */
export declare function getAIService(workspaceId: string, botType: "coach" | "customer"): Promise<{
    settings: AISettings;
    chat(params: ChatParams, interactionId?: string, usageType?: "chat" | "embedding" | "coach_chat"): Promise<ChatResult>;
    embed(input: string, interactionId?: string): Promise<EmbedResult>;
}>;
//# sourceMappingURL=factory.d.ts.map