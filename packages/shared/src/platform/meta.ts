
import { PlatformClient, SendMessageParams, RateLimitFn } from "./types.js";

export class MetaClient implements PlatformClient {
    private accessToken: string;
    private pageId: string;
    private version: string = "v19.0";
    private rateLimitFn?: RateLimitFn;

    constructor(pageId?: string, accessToken?: string, rateLimitFn?: RateLimitFn) {
        this.pageId = pageId || process.env.META_PAGE_ID || "";
        this.accessToken = accessToken || process.env.META_ACCESS_TOKEN || "";
        this.rateLimitFn = rateLimitFn;
    }

    async send(params: SendMessageParams): Promise<{ success: boolean; externalId?: string; error?: string }> {
        if (!this.accessToken || !this.pageId) {
            console.error("MetaClient: Missing Page ID or Access Token.");
            return { success: false, error: "Configuration Missing" };
        }

        // Apply Rate Limit if a limiter was injected
        if (this.rateLimitFn) {
            const limitKey = params.workspaceId || this.pageId || "global-meta";
            const allowed = await this.rateLimitFn(limitKey);
            if (!allowed) {
                return { success: false, error: "Rate Limit Exceeded (Max 5/5s)" };
            }
        }

        console.log(`[Meta] Sending message to ${params.to}...`);

        try {
            const url = `https://graph.facebook.com/${this.version}/${this.pageId}/messages`;

            const body = {
                recipient: { id: params.to },
                message: { text: params.text },
                access_token: this.accessToken
            };

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Meta API Error:", response.status, errorData);
                return { success: false, error: `API Error ${response.status}: ${JSON.stringify(errorData)}` };
            }

            const data = await response.json() as any;

            return {
                success: true,
                externalId: data.message_id
            };

        } catch (error: any) {
            console.error("Meta Network Error:", error);
            return { success: false, error: error.message };
        }
    }
}
