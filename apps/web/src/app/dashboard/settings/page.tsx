import { auth, getBackendToken } from "@/lib/auth";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const backendUrl = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001";
    const backendToken = await getBackendToken();

    const wsRes = await fetch(`${backendUrl}/settings/workspace-detailed`, {
        headers: { "Authorization": `Bearer ${backendToken}` },
        cache: 'no-store'
    });

    if (!wsRes.ok) return null;
    const workspace = await wsRes.json();

    return (
        <div className="relative space-y-8 min-h-[calc(100vh-6rem)] pb-12 overflow-hidden">
            {/* Decorative background gradients */}
            <div className="absolute -top-10 -left-20 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-[128px] opacity-70 animate-blob pointer-events-none" />
            <div className="absolute -top-10 -right-20 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-[128px] opacity-70 animate-blob animation-delay-2000 pointer-events-none" />

            <div className="relative z-10">
                <div className="mb-8 pt-4">
                    <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-500 dark:from-neutral-100 dark:to-neutral-500">
                        Settings
                    </h1>
                    <p className="text-muted-foreground mt-2 font-medium">
                        Configure your AI Engine parameters and manage workspace integration.
                    </p>
                </div>

                <div className="grid gap-6">
                    <SettingsForm workspace={workspace} />
                </div>
            </div>
        </div>
    );
}
