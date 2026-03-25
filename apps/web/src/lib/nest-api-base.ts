/**
 * NestJS `main.ts` uses `setGlobalPrefix('api')`, so all routes live under `/api/...`.
 * `NEXT_PUBLIC_API_URL` may be set with or without the `/api` suffix — normalize once.
 */
export function getNestApiBaseUrl(): string {
    const raw = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001";
    const trimmed = raw.replace(/\/$/, "");
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}
