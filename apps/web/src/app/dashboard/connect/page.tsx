
import { auth } from "@/lib/auth";
import { db } from "@ebizmate/db";
import { workspaces } from "@ebizmate/db";
import { eq } from "drizzle-orm";
import { ConnectSocialForm } from "./connect-form";

export default async function ConnectPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, session.user.id),
    });

    if (!workspace) return null;

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
