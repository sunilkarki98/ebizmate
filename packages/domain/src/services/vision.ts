import { getAIService } from "./factory.js";

/**
 * H-1 FIX: Validate image URLs to prevent SSRF attacks.
 * Blocks internal IPs, non-HTTP protocols, and private network ranges.
 */
function isAllowedImageUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) return false;
        const hostname = parsed.hostname.toLowerCase();
        // Block localhost, loopback, and link-local
        if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(hostname)) return false;
        // Block cloud metadata endpoints (AWS, GCP, Azure)
        if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') return false;
        // Block common private network ranges
        if (hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.')) return false;
        return true;
    } catch {
        return false;
    }
}

// M-4 FIX: Constants for download safety
const IMAGE_DOWNLOAD_TIMEOUT_MS = 10_000; // 10 seconds
const IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Downloads an image from a URL and converts it to a base64 string.
 * M-4 FIX: Added timeout and max size to prevent worker stall/OOM.
 */
async function downloadImageAsBase64(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_DOWNLOAD_TIMEOUT_MS);

    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`Failed to download image from ${url}: ${response.statusText}`);
        }

        // M-4 FIX: Check Content-Length before downloading body
        const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
        if (contentLength > IMAGE_MAX_SIZE_BYTES) {
            throw new Error(`Image too large (${(contentLength / 1024 / 1024).toFixed(1)}MB). Max: 10MB.`);
        }

        const arrayBuffer = await response.arrayBuffer();

        // Double-check actual size (Content-Length can be missing or wrong)
        if (arrayBuffer.byteLength > IMAGE_MAX_SIZE_BYTES) {
            throw new Error(`Image body too large (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB). Max: 10MB.`);
        }

        const buffer = Buffer.from(arrayBuffer);
        const mimeType = response.headers.get("content-type") || "image/jpeg";
        return `data:${mimeType};base64,${buffer.toString("base64")}`;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Uses Gemini (or the fallback provider) to analyze an image and return a detailed description of the product or issue.
 * We force the use of a vision-capable provider if possible.
 */
export async function analyzeImage(workspaceId: string, imageUrl: string): Promise<string> {
    // H-1 FIX: Prevent SSRF — only allow public HTTP(S) URLs
    if (!isAllowedImageUrl(imageUrl)) {
        console.warn(`[VisionService] Blocked disallowed image URL: ${imageUrl}`);
        return ""; // M-6 FIX: Return empty string instead of misleading fallback
    }

    try {
        const base64Image = await downloadImageAsBase64(imageUrl);

        // Use the customer AI service to stay aligned with the workspace's configuration
        const ai = await getAIService(workspaceId, "customer");

        const systemPrompt = "You are a highly precise eCommerce image analyst. Your only job is to describe the exact product or item shown in the image provided by the customer. Be concise but specific about colors, types, brands (if visible), and defining characteristics. Output ONLY the description.";

        const response = await ai.chat({
            systemPrompt,
            userMessage: [
                { type: "image_url", image_url: { url: base64Image } },
                { type: "text", text: "What is the exact product or item in this image? If there are multiple items, describe the main one." }
            ],
            temperature: 0.1,
            maxTokens: 150,
        });

        return response.content.trim();
    } catch (err) {
        console.error("[VisionService] Failed to analyze image:", err);
        // M-6 FIX: Return empty string so the LLM doesn't receive misleading fallback text
        return "";
    }
}
