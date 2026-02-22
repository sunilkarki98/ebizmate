import { AIProvider, ChatParams, ChatResult, EmbedResult } from "../../../common/types/ai";
export declare class OpenRouterProvider implements AIProvider {
    readonly name: "openrouter";
    private client;
    private model;
    constructor(apiKey: string, model: string);
    chat(params: ChatParams): Promise<ChatResult>;
    embed(text: string): Promise<EmbedResult>;
}
//# sourceMappingURL=openrouter.d.ts.map