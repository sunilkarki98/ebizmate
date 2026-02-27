
import { getBackendToken } from "@/lib/auth";
import KnowledgePageClient from "./knowledge-page-client";

export default async function ItemsPage() {
    const backendUrl = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001";
    const backendToken = await getBackendToken();

    // Parallelize independent fetches
    const [wsRes, itemsRes] = await Promise.all([
        fetch(`${backendUrl}/settings/workspace`, {
            headers: { "Authorization": `Bearer ${backendToken}` },
            cache: 'no-store'
        }),
        fetch(`${backendUrl}/items/all`, {
            headers: { "Authorization": `Bearer ${backendToken}` },
            cache: 'no-store'
        })
    ]);

    const workspace = wsRes.ok ? await wsRes.json() : null;
    const workspaceItems = itemsRes.ok ? await itemsRes.json() : [];

    return <KnowledgePageClient initialItems={workspaceItems} workspace={workspace} />;
}
