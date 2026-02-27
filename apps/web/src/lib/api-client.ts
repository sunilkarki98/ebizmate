import { auth, getBackendToken } from "@/lib/auth";

const backendUrl = process.env['NEXT_PUBLIC_API_URL'] || "http://localhost:3001";

interface ApiOptions extends RequestInit {
    /** 
     * Defaults to true. If false, token is not appended.
     */
    requireAuth?: boolean;
}

/**
 * A unified internal fetch wrapper for Next.js Server Actions connecting to the NestJS API.
 * Automatically handles `backendUrl`, Authorization headers, and `Content-Type: application/json`.
 * Throws unified Error objects on failure.
 */
export async function apiClient<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { requireAuth = true, headers, body, ...restOptions } = options;

    const reqHeaders = new Headers(headers);

    if (requireAuth) {
        const token = await getBackendToken();
        if (!token) {
            throw new Error("Unauthorized: No backend token");
        }
        reqHeaders.set("Authorization", `Bearer ${token}`);
    }

    if (body && !reqHeaders.has("Content-Type") && typeof body === "string") {
        reqHeaders.set("Content-Type", "application/json");
    }

    const url = `${backendUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const response = await fetch(url, {
        headers: reqHeaders,
        ...(body !== undefined ? { body } : {}),
        ...restOptions,
    });

    if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch {
            // Failed to parse JSON error, fall back to default
        }
        throw new Error(errorMessage);
    }

    // Some endpoints return 204 No Content or empty bodies
    const text = await response.text();
    if (!text) return null as T;

    try {
        return JSON.parse(text) as T;
    } catch {
        return text as T;
    }
}

/**
 * Validates the current user is an admin.
 * @returns The admin session user object.
 * @throws Error if unauthorized or forbidden.
 */
export async function requireAdmin() {
    const session = await auth('admin');
    if (!session?.user?.id) throw new Error("Unauthorized");
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") throw new Error("Forbidden: Admin access required");
    return session.user;
}
