import { AIProvider, ChatParams, ChatResult, EmbedResult } from "../../../common/types/ai";
/**
 * Mock AI provider for testing and development.
 * Returns configurable responses without making any API calls.
 */
export declare class MockProvider implements AIProvider {
    readonly name: "mock";
    chat(params: ChatParams): Promise<ChatResult>;
    embed(text: string): Promise<EmbedResult>;
}
//# sourceMappingURL=mock.d.ts.map