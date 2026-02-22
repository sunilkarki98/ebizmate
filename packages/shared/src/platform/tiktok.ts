
import { PlatformClient, SendMessageParams, RateLimitFn } from "./types.js";

export class TikTokClient implements PlatformClient {
    private accessToken: string;
    private baseUrl: string = "https://open.tiktokapis.com/v2";
    private rateLimitFn?: RateLimitFn;

    constructor(accessToken?: string, rateLimitFn?: RateLimitFn) {
        this.accessToken = accessToken || process.env.TIKTOK_ACCESS_TOKEN || "";
        this.rateLimitFn = rateLimitFn;
    }

    async send(params: SendMessageParams): Promise<{ success: boolean; externalId?: string; error?: string }> {
        if (!this.accessToken) {
            console.error("TikTokClient: No access token provided.");
            return { success: false, error: "Missing Access Token" };
        }

        // Apply Rate Limit if a limiter was injected
        if (this.rateLimitFn) {
            const limitKey = params.workspaceId || "global-tiktok";
            const allowed = await this.rateLimitFn(limitKey);
            if (!allowed) {
                return { success: false, error: "Rate Limit Exceeded (Max 5/5s)" };
            }
        }

        console.log(`[TikTok] Sending reply to ${params.to}...`);

        try {
            const endpoint = params.replyToMessageId
                ? `${this.baseUrl}/video/comment/reply/`
                : `${this.baseUrl}/video/comment/publish/`;

            const body = {
                video_id: params.to,
                text: params.text,
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

            const data = await response.json() as any;
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
