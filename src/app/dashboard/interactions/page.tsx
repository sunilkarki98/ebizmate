import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { interactions, workspaces } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Suspense } from "react";
import InteractionsClient from "./interactions-client";

export default async function InteractionsPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, session.user.id),
    });

    if (!workspace) return null;

    const logs = await db.query.interactions.findMany({
        where: eq(interactions.workspaceId, workspace.id),
        orderBy: desc(interactions.createdAt),
        limit: 50,
        with: {
            post: true,
        },
    });

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

