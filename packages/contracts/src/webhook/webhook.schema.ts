import { z } from 'zod';

export const webhookBodySchema = z.object({
    type: z.string().optional(),
    userId: z.string().max(500).optional(),
    sec_uid: z.string().max(500).optional(),
    authorId: z.string().max(500).optional(),
    userName: z.string().max(200).optional(),
    text: z.string().max(5000).optional(),
    message: z.string().max(5000).optional(),
    commentId: z.string().max(500).optional(),
    messageId: z.string().max(500).optional(),
    video_id: z.string().max(500).optional(),
    item_id: z.string().max(500).optional(),
    post_id: z.string().max(500).optional(),
    description: z.string().max(5000).optional(),
    caption: z.string().max(5000).optional(),
    // TikTok DM fields
    conversation_id: z.string().max(500).optional(),
    conversation_short_id: z.string().max(500).optional(),
}).passthrough(); // Allow extra fields for platform-specific data

export type WebhookBody = z.infer<typeof webhookBodySchema>;
