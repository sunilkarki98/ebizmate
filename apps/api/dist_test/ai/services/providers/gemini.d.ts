import { AIProvider, ChatParams, ChatResult, EmbedResult } from "../../../common/types/ai";
export declare class GeminiProvider implements AIProvider {
    readonly name: "gemini";
    private client;
    private apiKey;
    private model;
    constructor(apiKey: string, model: string);
    private getClient;
    chat(params: ChatParams): Promise<ChatResult>;
    embed(text: string, userId?: string): Promise<EmbedResult>;
}
//# sourceMappingURL=gemini.d.ts.map