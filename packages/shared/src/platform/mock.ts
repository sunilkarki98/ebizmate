
import { PlatformClient, SendMessageParams } from "./types.js";

export class MockClient implements PlatformClient {
    async send(params: SendMessageParams): Promise<{ success: boolean; externalId?: string; error?: string }> {
        console.log("--- MOCK OUTBOUND MESSAGE ---");
        console.log(`To: ${params.to}`);
        console.log(`Text: ${params.text}`);
        if (params.mediaUrl) console.log(`Media: [${params.mediaType}] ${params.mediaUrl}`);
        if (params.templateName) console.log(`Template: ${params.templateName} (${params.templateVariables?.join(", ")})`);
        if (params.replyToMessageId) console.log(`Reply To: ${params.replyToMessageId}`);
        console.log("-----------------------------");

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            success: true,
            externalId: `mock-msg-${Date.now()}`,
        };
    }
}
