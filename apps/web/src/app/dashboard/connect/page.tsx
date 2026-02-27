
import { auth, getBackendToken } from "@/lib/auth";
import { ConnectSocialForm } from "./connect-form";
import { IntegrationCard } from "@/components/dashboard/integration-card";

export default async function ConnectPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const backendUrl = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001";
    const backendToken = await getBackendToken();

    const wsRes = await fetch(`${backendUrl}/settings/workspace`, {
        headers: { "Authorization": `Bearer ${backendToken}` },
        cache: 'no-store'
    });

    if (!wsRes.ok) return null;
    const workspace = await wsRes.json();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Integrations & Identity</h1>
                <p className="text-muted-foreground">
                    Link your social media accounts and define your brand identity for the AI.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <IntegrationCard
                    platform="instagram"
                    title="Instagram"
                    description="Connect to auto-reply to comments and DMs."
                    isConnected={workspace?.platform === 'instagram' && !!workspace?.accessToken}
                    oauthUrl="/api/auth/connect/instagram"
                />
                <IntegrationCard
                    platform="facebook"
                    title="Messenger"
                    description="Connect your Facebook Page for Messenger AI."
                    isConnected={workspace?.platform === 'facebook' && !!workspace?.accessToken}
                    oauthUrl="/api/auth/connect/facebook"
                />
                <IntegrationCard
                    platform="tiktok"
                    title="TikTok"
                    description="Connect for TikTok video comments and DMs."
                    isConnected={workspace?.platform === 'tiktok' && !!workspace?.accessToken}
                    oauthUrl="/api/auth/connect/tiktok"
                />
            </div>

            <div className="grid gap-6">
                <ConnectSocialForm workspace={workspace} />
            </div>
        </div>
    );
}
