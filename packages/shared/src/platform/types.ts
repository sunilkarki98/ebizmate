
export type PlatformName = "tiktok" | "instagram" | "facebook" | "whatsapp" | "generic";

export interface SendMessageParams {
    to: string; // The platform-specific user ID (e.g., PSID, WAID)
    text: string;
    mediaUrl?: string;
    mediaType?: "image" | "video" | "audio" | "document" | "carousel";

    // For Generic Templates / Carousels
    carouselItems?: Array<{
        title: string;
        subtitle?: string;
        imageUrl?: string;
        buttonText?: string;
        buttonPayload?: string;
    }>;

    // For WhatsApp Template Messages
    templateName?: string;
    templateVariables?: string[];
    // Context (replying to a specific message)
    replyToMessageId?: string;
    // TikTok DM — the conversation_id needed to address DMs vs comments
    conversationId?: string;
    // System Context
    workspaceId?: string;
}

export interface PlatformClient {
    /**
     * Send a direct message or reply to a user.
     */
    send(params: SendMessageParams): Promise<{ success: boolean; externalId?: string; error?: string }>;

    /**
     * Verify a webhook signature (optional, can be static)
     */
    verifySignature?(payload: string, signature: string, secret: string): boolean;

    /**
     * Fetch recent posts/media from the platform to sync into the knowledge base.
     */
    fetchRecentPosts?(): Promise<Array<{
        id: string;
        caption: string;
        mediaUrl?: string;
        createdAt: Date;
    }>>;
}

/**
 * Optional rate-limiter function that callers can inject.
 * Returns `true` if the request is allowed.
 */
export type RateLimitFn = (workspaceId: string) => Promise<boolean>;
