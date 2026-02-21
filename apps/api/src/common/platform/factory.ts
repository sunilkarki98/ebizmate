
import { PlatformClient, PlatformName } from "./types";
import { MockClient } from "./mock";
import { TikTokClient } from "./tiktok";
import { MetaClient } from "./meta";

// Cache client instances — they're stateless singletons
const clientCache = new Map<string, PlatformClient>();

export class PlatformFactory {
    static getClient(platform: string): PlatformClient {
        const key = platform.toLowerCase();
        const cached = clientCache.get(key);
        if (cached) return cached;

        let client: PlatformClient;
        switch (key as PlatformName) {
            case "tiktok":
                client = new TikTokClient();
                break;
            case "instagram":
            case "facebook":
            case "whatsapp":
                client = new MetaClient();
                break;
            default:
                client = new MockClient();
                break;
        }

        clientCache.set(key, client);
        return client;
    }
}
