import { auth } from "@/lib/auth";
import { getBackendToken } from "@/lib/auth";
import { Suspense } from "react";
import InteractionsClient from "./interactions-client";

export default async function InteractionsPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const backendToken = await getBackendToken();

    // 1. Fetch Workspace Info (to pass down to client, just in case)
    const wsRes = await fetch(`${backendUrl}/settings/workspace`, {
        headers: { "Authorization": `Bearer ${backendToken}` },
        cache: 'no-store'
    });
    if (!wsRes.ok) return null;
    const workspace = await wsRes.json();

    // 2. Fetch Interactions
    const interactionsRes = await fetch(`${backendUrl}/ai/customer/interactions`, {
        headers: { "Authorization": `Bearer ${backendToken}` },
        cache: 'no-store'
    });
    const logs = interactionsRes.ok ? await interactionsRes.json() : [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Interactions</h1>
                <p className="text-muted-foreground">
                    Review automated replies and teach the bot new answers.
                </p>
            </div>

            <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse">Loading interactions...</div>}>
                <InteractionsClient initialLogs={logs} workspace={workspace} />
            </Suspense>
        </div>
    );
}

