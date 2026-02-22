
import { auth, getBackendToken } from "@/lib/auth";
import { ConnectSocialForm } from "./connect-form";

export default async function ConnectPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const backendToken = await getBackendToken();

    const wsRes = await fetch(`${backendUrl}/settings/workspace`, {
        headers: { "Authorization": `Bearer ${backendToken}` },
        cache: 'no-store'
    });

    if (!wsRes.ok) return null;
    const workspace = await wsRes.json();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Connect Social</h1>
                <p className="text-muted-foreground">
                    Link your social media accounts and define your brand identity.
                </p>
            </div>

            <div className="grid gap-6">
                <ConnectSocialForm workspace={workspace} />
            </div>
        </div>
    );
}
