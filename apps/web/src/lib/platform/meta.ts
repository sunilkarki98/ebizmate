
import { PlatformClient, SendMessageParams } from "./types";

export class MetaClient implements PlatformClient {
    private accessToken: string;
    private pageId: string; // The Facebook Page ID linked to the Instagram Account
    private version: string = "v19.0";

    constructor(pageId?: string, accessToken?: string) {
        this.pageId = pageId || process.env.META_PAGE_ID || "";
        this.accessToken = accessToken || process.env.META_ACCESS_TOKEN || "";
    }

    async send(params: SendMessageParams): Promise<{ success: boolean; externalId?: string; error?: string }> {
        if (!this.accessToken || !this.pageId) {
            console.error("MetaClient: Missing Page ID or Access Token.");
            return { success: false, error: "Configuration Missing" };
        }

        // Apply Rate Limit
        const limitKey = params.workspaceId || this.pageId || "global-meta";
        const { checkOutboundRateLimit } = await import("./rate-limit");

        const allowed = await checkOutboundRateLimit(limitKey);
        if (!allowed) {
            return { success: false, error: "Rate Limit Exceeded (Max 5/5s)" };
        }

        console.log(`[Meta] Sending message to ${params.to}...`);

        try {
            // Instagram Graph API / Facebook Graph API
            // POST /{page-id}/messages

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

            const data = await response.json();
            // { recipient_id: "...", message_id: "..." }

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
