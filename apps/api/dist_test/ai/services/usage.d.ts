export declare function logUsage(workspaceId: string, interactionId: string | null, provider: string, model: string, operation: "chat" | "embedding" | "coach_chat", tokens: {
    input: number;
    output: number;
}, latencyMs: number, success: boolean, errorMessage?: string): Promise<void>;
//# sourceMappingURL=usage.d.ts.map