import { auth, getBackendToken } from "@/lib/auth";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const backendToken = await getBackendToken();

    const wsRes = await fetch(`${backendUrl}/settings/workspace-detailed`, {
        headers: { "Authorization": `Bearer ${backendToken}` },
        cache: 'no-store'
    });

    if (!wsRes.ok) return null;
    const workspace = await wsRes.json();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your workspace and connected accounts.
                </p>
            </div>

            <div className="grid gap-6">
                <SettingsForm workspace={workspace} />
            </div>
        </div>
    );
}
