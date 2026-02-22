export declare const INGESTION_PROMPT: (contentToAnalyze: string) => string;
type WorkspaceContext = {
    name: string | null;
    businessName: string | null;
    industry: string | null;
    about: string | null;
    targetAudience: string | null;
    toneOfVoice: string | null;
    settings: unknown;
};
export declare function CUSTOMER_SYSTEM_PROMPT(workspace: WorkspaceContext, contextHeader: string, itemsContext: string, isSimulation?: boolean): string;
export {};
//# sourceMappingURL=prompts.d.ts.map