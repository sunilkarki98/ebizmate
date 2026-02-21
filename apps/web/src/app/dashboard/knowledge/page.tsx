
import { getWorkspace } from "@/lib/item-actions";
import { db } from "@ebizmate/db";
import { items } from "@ebizmate/db";
import { eq, desc } from "drizzle-orm";
import KnowledgePageClient from "./knowledge-page-client";

export default async function ItemsPage() {
    const workspace = await getWorkspace();

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
        const rows = await db
            .select({
                id: items.id,
                name: items.name,
                content: items.content,
                category: items.category,
                sourceId: items.sourceId,
                meta: items.meta,
                createdAt: items.createdAt,
                updatedAt: items.updatedAt,
            })
            .from(items)
            .where(eq(items.workspaceId, workspace.id))
            .orderBy(desc(items.createdAt));

        workspaceItems = rows.map((r) => ({
            ...r,
            createdAt: r.createdAt?.toISOString() ?? null,
            updatedAt: r.updatedAt?.toISOString() ?? null,
        }));
    }

    return <KnowledgePageClient initialItems={workspaceItems} workspace={workspace} />;
}
