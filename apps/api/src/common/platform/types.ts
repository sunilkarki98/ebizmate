
export type PlatformName = "tiktok" | "instagram" | "facebook" | "whatsapp" | "generic";

export interface SendMessageParams {
    to: string; // The platform-specific user ID (e.g., PSID, WAID)
    text: string;
    mediaUrl?: string;
    mediaType?: "image" | "video" | "audio" | "document";
    // For WhatsApp Template Messages
    templateName?: string;
    templateVariables?: string[];
    // Context (replying to a specific message)
    replyToMessageId?: string;
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
}
