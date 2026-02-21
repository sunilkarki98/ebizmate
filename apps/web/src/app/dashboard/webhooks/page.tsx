import { auth } from "@/lib/auth";
import { db } from "@ebizmate/db";
import { workspaces } from "@ebizmate/db";
import { eq } from "drizzle-orm";
import { WebhookSimulatorClient } from "./webhook-simulator";

export default async function WebhooksPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, session.user.id),
    });

    if (!workspace) return null;

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
