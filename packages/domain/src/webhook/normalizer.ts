/**
 * Platform Webhook Normalizer
 * 
 * Converts platform-specific webhook payloads into a unified internal shape.
 * Each platform (Meta, TikTok) sends webhooks in completely different formats.
 * This normalizer is the single translation layer that makes the rest of the
 * pipeline platform-agnostic.
 */

// ---------------------------------------------------------------------------
// Unified Shape — every platform webhook is converted to this
// ---------------------------------------------------------------------------

export interface NormalizedWebhookEvent {
    platform: string;
    eventType: 'message' | 'comment' | 'post' | 'unknown';
    platformUserId: string;
    userName?: string;
    text: string;
    mediaUrl?: string;
    externalId: string;
    parentPostId?: string;
    rawPayload: any;
}

// ---------------------------------------------------------------------------
// Meta Platforms (Instagram, Messenger, WhatsApp, Facebook Pages)
// All use the Graph API with nested entry[].messaging[] or entry[].changes[]
// Docs: https://developers.facebook.com/docs/graph-api/webhooks
// ---------------------------------------------------------------------------

function normalizeMetaMessaging(platform: string, payload: any): NormalizedWebhookEvent[] {
    const events: NormalizedWebhookEvent[] = [];
    const entries = payload.entry || [];

    for (const entry of entries) {
        // Instagram DMs & Messenger use entry[].messaging[]
        const messagingEvents = entry.messaging || [];
        for (const msg of messagingEvents) {
            if (msg.message) {
                events.push({
                    platform,
                    eventType: 'message',
                    platformUserId: msg.sender?.id || 'unknown',
                    userName: msg.sender?.name || undefined,
                    text: msg.message?.text || '',
                    mediaUrl: msg.message?.attachments?.[0]?.payload?.url || undefined,
                    externalId: msg.message?.mid || `meta-msg-${Date.now()}`,
                    rawPayload: payload,
                });
            }
        }

        // WhatsApp uses entry[].changes[].value.messages[]
        const changes = entry.changes || [];
        for (const change of changes) {
            const value = change.value || {};

            // WhatsApp messages
            if (value.messages) {
                const contacts = value.contacts || [];
                for (const waMsg of value.messages) {
                    const contact = contacts.find((c: any) => c.wa_id === waMsg.from);
                    events.push({
                        platform: 'whatsapp',
                        eventType: 'message',
                        platformUserId: waMsg.from || 'unknown',
                        userName: contact?.profile?.name || undefined,
                        text: waMsg.text?.body || waMsg.caption || '',
                        mediaUrl: waMsg.image?.id || waMsg.video?.id || waMsg.document?.id || undefined,
                        externalId: waMsg.id || `wa-msg-${Date.now()}`,
                        rawPayload: payload,
                    });
                }
            }

            // Facebook Page post comments
            if (change.field === 'feed' && value.item === 'comment') {
                events.push({
                    platform: 'facebook_pages',
                    eventType: 'comment',
                    platformUserId: value.from?.id || 'unknown',
                    userName: value.from?.name || undefined,
                    text: value.message || '',
                    externalId: value.comment_id || `fb-comment-${Date.now()}`,
                    parentPostId: value.post_id || undefined,
                    rawPayload: payload,
                });
            }
        }
    }

    return events;
}

// ---------------------------------------------------------------------------
// TikTok — uses a flat/semi-flat structure
// Docs: https://developers.tiktok.com/doc/webhooks-overview
// ---------------------------------------------------------------------------

function normalizeTikTok(payload: any): NormalizedWebhookEvent[] {
    const eventType = payload.type || 'unknown';

    // Post publish events
    if (eventType === 'video.publish') {
        return [{
            platform: 'tiktok',
            eventType: 'post',
            platformUserId: payload.userId || payload.sec_uid || 'unknown',
            text: payload.description || payload.caption || '',
            externalId: payload.video_id || payload.item_id || `tt-post-${Date.now()}`,
            rawPayload: payload,
        }];
    }

    // Comment or message events
    return [{
        platform: 'tiktok',
        eventType: eventType.includes('comment') ? 'comment' : eventType.includes('message') ? 'message' : 'unknown',
        platformUserId: payload.userId || payload.sec_uid || payload.authorId || 'unknown',
        userName: payload.userName || undefined,
        text: payload.text || payload.message || payload.content || '',
        mediaUrl: payload.imageUrl || payload.mediaUrl || undefined,
        externalId: payload.commentId || payload.messageId || payload.conversation_id || `tt-evt-${Date.now()}`,
        parentPostId: payload.video_id || payload.post_id || undefined,
        rawPayload: payload,
    }];
}

// ---------------------------------------------------------------------------
// Public API — single entry point
// ---------------------------------------------------------------------------

/**
 * Normalize any platform's webhook payload into unified events.
 * 
 * @param platform - The platform identifier (instagram, messenger, whatsapp, facebook_pages, tiktok)
 * @param payload - The raw webhook payload from the platform
 * @returns An array of normalized events (most webhooks contain 1 event, but Meta can batch)
 */
export function normalizeWebhookPayload(platform: string, payload: any): NormalizedWebhookEvent[] {
    const p = platform.toLowerCase();

    // Meta platforms all use the same nested entry[] format
    if (p === 'instagram' || p === 'messenger' || p === 'facebook' || p === 'facebook_pages' || p === 'whatsapp') {
        // If it has entry[], it's a proper Meta webhook
        if (payload.entry) {
            return normalizeMetaMessaging(p, payload);
        }
        // Fall through: maybe it's a flat test/mock payload — treat like TikTok format
    }

    if (p === 'tiktok') {
        return normalizeTikTok(payload);
    }

    // Generic fallback for flat payloads (mock webhooks, unknown platforms)
    return [{
        platform: p,
        eventType: (payload.type?.includes('comment') ? 'comment' : payload.type?.includes('message') ? 'message' : 'unknown') as any,
        platformUserId: payload.userId || payload.authorId || payload.sec_uid || 'unknown',
        userName: payload.userName || undefined,
        text: payload.text || payload.message || '',
        mediaUrl: payload.imageUrl || payload.mediaUrl || undefined,
        externalId: payload.commentId || payload.messageId || `generic-${Date.now()}`,
        parentPostId: payload.video_id || payload.post_id || undefined,
        rawPayload: payload,
    }];
}
