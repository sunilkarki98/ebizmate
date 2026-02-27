import { PlatformClient, SendMessageParams, RateLimitFn } from "./types.js";
import { stripResidualFunctionTags } from "../utils.js";

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

        // ─── Route: DM or Comment ───────────────────────────────────────────
        // If a conversationId is present, this is a DM reply.
        // Otherwise, fall back to the video comment API.
        if (params.conversationId) {
            return this.sendDirectMessage(params);
        }

        return this.sendComment(params);
    }

    // ─── TikTok Business Messages API (DMs) ─────────────────────────────────
    private async sendDirectMessage(params: SendMessageParams): Promise<{ success: boolean; externalId?: string; error?: string }> {
        console.log(`[TikTok DM] Sending DM to conversation ${params.conversationId}...`);

        try {
            const endpoint = `${this.baseUrl}/business/message/send/`;

            // Build the message body
            // TikTok Business Messages supports: text, image, video, interactive
            const body: any = {
                conversation_id: params.conversationId,
                content: {} as any,
            };

            const safeText = params.text ? stripResidualFunctionTags(params.text) : undefined;

            if (params.mediaType === "image" && params.mediaUrl) {
                body.content.message_type = "image";
                body.content.image = { image_url: params.mediaUrl };
                // If there's also text, append it as a second message or use it as alt text
                if (safeText) {
                    body.content.text = safeText;
                }
            } else {
                body.content.message_type = "text";
                body.content.text = safeText;
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("TikTok DM API Error:", response.status, errorData);
                return { success: false, error: `DM API Error ${response.status}: ${JSON.stringify(errorData)}` };
            }

            const data = await response.json() as any;
            const newId = data.data?.message_id || `dm-sent-${Date.now()}`;

            return {
                success: true,
                externalId: newId,
            };

        } catch (error: any) {
            console.error("TikTok DM Network Error:", error);
            return { success: false, error: error.message };
        }
    }

    // ─── TikTok Video Comment API (Legacy) ──────────────────────────────────
    private async sendComment(params: SendMessageParams): Promise<{ success: boolean; externalId?: string; error?: string }> {
        console.log(`[TikTok Comment] Sending comment reply to ${params.to}...`);

        try {
            const endpoint = params.replyToMessageId
                ? `${this.baseUrl}/video/comment/reply/`
                : `${this.baseUrl}/video/comment/publish/`;

            const body = {
                video_id: params.to,
                text: params.text ? stripResidualFunctionTags(params.text) : undefined,
                comment_id: params.replyToMessageId,
            };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("TikTok Comment API Error:", response.status, errorData);
                return { success: false, error: `Comment API Error ${response.status}: ${JSON.stringify(errorData)}` };
            }

            const data = await response.json() as any;
            const newId = data.data?.comment_id || data.data?.message_id || `comment-sent-${Date.now()}`;

            return {
                success: true,
                externalId: newId,
            };

        } catch (error: any) {
            console.error("TikTok Comment Network Error:", error);
            return { success: false, error: error.message };
        }
    }

    async fetchRecentPosts() {
        console.log(`[TikTok] Mocking fetch for recent posts`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return Array.from({ length: 5 }).map((_, i) => ({
            id: `tiktok-post-${Date.now()}-${i}`,
            caption: `Mock TikTok Video ${i + 1}: Link in bio! Grab this limited edition item for $${(i + 1) * 15} before it sells out.`,
            createdAt: new Date(Date.now() - i * 86400000)
        }));
    }
}
