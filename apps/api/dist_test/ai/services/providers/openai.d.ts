import { AIProvider, ChatParams, ChatResult, EmbedResult } from "../../../common/types/ai";
export declare class OpenAIProvider implements AIProvider {
    readonly name: "openai";
    private client;
    private model;
    private embeddingModel;
    constructor(apiKey: string, model: string, embeddingModel: string);
    chat(params: ChatParams): Promise<ChatResult>;
    embed(text: string): Promise<EmbedResult>;
}
//# sourceMappingURL=openai.d.ts.map