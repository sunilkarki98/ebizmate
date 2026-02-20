
import { PlatformClient, SendMessageParams } from "./types";

export class TikTokClient implements PlatformClient {
    private accessToken: string;
    private baseUrl: string = "https://open.tiktokapis.com/v2";

    constructor(accessToken?: string) {
        // In a real app, you might fetch this from DB based on workspace, 
        // but for the factory pattern, we might pass it in or load from env for single-tenant
        this.accessToken = accessToken || process.env.TIKTOK_ACCESS_TOKEN || "";
    }

    async send(params: SendMessageParams): Promise<{ success: boolean; externalId?: string; error?: string }> {
        if (!this.accessToken) {
            console.error("TikTokClient: No access token provided.");
            return { success: false, error: "Missing Access Token" };
        }

        // Apply Rate Limit (Token Bucket)
        // We use the workspaceId passed in params, or fall back to "global" (though processor should always pass it)
        const limitKey = params.workspaceId || "global-tiktok";

        // Dynamic Import to avoid circular dependency issues if any
        const { checkOutboundRateLimit } = await import("./rate-limit");
        const allowed = await checkOutboundRateLimit(limitKey);

        if (!allowed) {
            return { success: false, error: "Rate Limit Exceeded (Max 5/5s)" };
        }

        console.log(`[TikTok] Sending reply to ${params.to}...`);

        try {
            // Determine endpoint based on context (Comment reply vs DM)
            // Note: TikTok API endpoints vary significantly by version and access tier.
            // This is a standard structure for v2 Video Comments.

            const endpoint = params.replyToMessageId
                ? `${this.baseUrl}/video/comment/reply/`
                : `${this.baseUrl}/video/comment/publish/`;

            // Payload structure for TikTok
            const body = {
                video_id: params.to, // Or context ID
                text: params.text,
                // If replying to a specific comment
                comment_id: params.replyToMessageId
            };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("TikTok API Error:", response.status, errorData);
                return { success: false, error: `API Error ${response.status}: ${JSON.stringify(errorData)}` };
            }

            const data = await response.json();

            // Assuming standard TikTok response shape
            // { data: { comment_id: "123" } }
            const newId = data.data?.comment_id || data.data?.message_id || `sent-${Date.now()}`;

            return {
                success: true,
                externalId: newId
            };

        } catch (error: any) {
            console.error("TikTok Network Error:", error);
            return { success: false, error: error.message };
        }
    }
}
