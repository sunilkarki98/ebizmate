
import { PlatformClient, PlatformName, RateLimitFn } from "./types.js";
import { MockClient } from "./mock.js";
import { TikTokClient } from "./tiktok.js";
import { MetaClient } from "./meta.js";

export interface PlatformFactoryOptions {
    /** Workspace-specific OAuth access token (decrypted). Falls back to env vars if not provided. */
    accessToken?: string;
    /** Meta-specific Page ID. Falls back to META_PAGE_ID env var. */
    pageId?: string;
    /** Optional rate-limit function. If omitted, no rate limiting is applied. */
    rateLimitFn?: RateLimitFn;
}

/**
 * Creates a platform client for outbound messaging.
 *
 * Unlike the old factory, this does NOT cache instances because
 * each workspace may have a different access token. Caching is
 * the caller's responsibility if needed.
 */
export class PlatformFactory {
    static getClient(platform: string, options: PlatformFactoryOptions = {}): PlatformClient {
        const key = platform.toLowerCase() as PlatformName;

        switch (key) {
            case "tiktok":
                return new TikTokClient(options.accessToken, options.rateLimitFn);
            case "instagram":
            case "facebook":
            case "whatsapp":
                return new MetaClient(options.pageId, options.accessToken, options.rateLimitFn);
            default:
                return new MockClient();
        }
    }
}
