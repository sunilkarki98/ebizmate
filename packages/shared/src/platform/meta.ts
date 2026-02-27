import { PlatformClient, SendMessageParams, RateLimitFn } from "./types.js";
import { stripResidualFunctionTags } from "../utils.js";

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

            const safeText = params.text ? stripResidualFunctionTags(params.text) : undefined;
            let messagePayload: any = { text: safeText };

            if (params.mediaType === "carousel" && params.carouselItems && params.carouselItems.length > 0) {
                messagePayload = {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "generic",
                            elements: params.carouselItems.map(item => {
                                const element: any = {
                                    title: item.title,
                                    subtitle: item.subtitle,
                                };
                                if (item.imageUrl) element.image_url = item.imageUrl;
                                if (item.buttonText) {
                                    if (item.buttonPayload && item.buttonPayload.startsWith("http")) {
                                        element.buttons = [{
                                            type: "web_url",
                                            url: item.buttonPayload,
                                            title: item.buttonText
                                        }];
                                    } else {
                                        element.buttons = [{
                                            type: "postback",
                                            title: item.buttonText,
                                            payload: item.buttonPayload || "BUY_CLICKED"
                                        }];
                                    }
                                }
                                return element;
                            })
                        }
                    }
                };
            } else if (params.mediaUrl) {
                messagePayload = {
                    attachment: {
                        type: params.mediaType || "image",
                        payload: { is_reusable: true, url: params.mediaUrl }
                    }
                };
            }

            const body = {
                recipient: { id: params.to },
                message: messagePayload
            };

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.accessToken}`
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

    async fetchRecentPosts() {
        console.log(`[Meta] Mocking fetch for recent posts for Page ${this.pageId}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return Array.from({ length: 5 }).map((_, i) => ({
            id: `meta-post-${Date.now()}-${i}`,
            caption: `Mock Facebook Post ${i + 1}: Check out our new amazing product! It costs $${(i + 1) * 10} and is perfect for the season.`,
            createdAt: new Date(Date.now() - i * 86400000)
        }));
    }
}
