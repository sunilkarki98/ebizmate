export declare const coachTools: ({
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            name: {
                type: string;
            };
            content: {
                type: string;
            };
            category: {
                type: string;
                enum: string[];
            };
            expires_in: {
                type: string;
            };
            businessName?: undefined;
            industry?: undefined;
            toneOfVoice?: undefined;
            about?: undefined;
            language?: undefined;
            ai_active?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            businessName: {
                type: string;
            };
            industry: {
                type: string;
            };
            toneOfVoice: {
                type: string;
            };
            about: {
                type: string;
            };
            language: {
                type: string;
            };
            ai_active: {
                type: string;
            };
            name?: undefined;
            content?: undefined;
            category?: undefined;
            expires_in?: undefined;
        };
        required?: undefined;
    };
})[];
/**
 * Main coach processor
 */
export declare function processCoachMessage(workspaceId: string, userMessage: string, history: Array<{
    role: "user" | "coach";
    content: string;
}>): Promise<string>;
//# sourceMappingURL=agent.d.ts.map