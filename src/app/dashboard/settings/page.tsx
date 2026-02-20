import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, session.user.id),
        with: {
            aiSettings: true,
        }
    });

    if (!workspace) return null;

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
