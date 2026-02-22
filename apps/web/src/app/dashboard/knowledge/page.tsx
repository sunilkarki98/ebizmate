
import { getBackendToken } from "@/lib/auth";
import KnowledgePageClient from "./knowledge-page-client";

export default async function ItemsPage() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const backendToken = await getBackendToken();

    // Fetch workspace context
    const wsRes = await fetch(`${backendUrl}/settings/workspace`, {
        headers: { "Authorization": `Bearer ${backendToken}` },
        cache: 'no-store'
    });
    const workspace = wsRes.ok ? await wsRes.json() : null;

    let workspaceItems: {
        id: string;
        name: string;
        content: string | null;
        category: string | null;
        sourceId: string | null;
        meta: any;
        createdAt: string | null;
        updatedAt: string | null;
    }[] = [];

    if (workspace) {
        const itemsRes = await fetch(`${backendUrl}/items/all`, {
            headers: { "Authorization": `Bearer ${backendToken}` },
            cache: 'no-store'
        });

        if (itemsRes.ok) {
            workspaceItems = await itemsRes.json();
        }
    }

    return <KnowledgePageClient initialItems={workspaceItems} workspace={workspace} />;
}
