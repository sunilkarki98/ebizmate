import { auth, getBackendToken } from "@/lib/auth";
import { WebhookSimulatorClient } from "./webhook-simulator";

export default async function WebhooksPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const backendToken = await getBackendToken();

    // 1. Fetch Workspace Info 
    const wsRes = await fetch(`${backendUrl}/settings/workspace`, {
        headers: { "Authorization": `Bearer ${backendToken}` },
        cache: 'no-store'
    });
    if (!wsRes.ok) return null;
    const workspace = await wsRes.json();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Webhook Simulator</h1>
                <p className="text-muted-foreground">
                    Test your AI agent by simulating incoming messages from social platforms.
                </p>
            </div>

            <div className="max-w-2xl">
                <WebhookSimulatorClient workspace={workspace} />
            </div>
        </div>
    );
}
