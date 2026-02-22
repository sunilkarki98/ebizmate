import { AIProvider, ChatParams, ChatResult, EmbedResult } from "../../../common/types/ai";
export declare class GroqProvider implements AIProvider {
    readonly name: "groq";
    private client;
    private model;
    constructor(apiKey: string, model: string);
    chat(params: ChatParams): Promise<ChatResult>;
    embed(text: string): Promise<EmbedResult>;
}
//# sourceMappingURL=groq.d.ts.map