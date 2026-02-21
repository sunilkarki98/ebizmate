import { getWorkspacesAction } from "@/lib/admin-actions";
import { WorkspacesClient } from "./workspaces-client";

export default async function WorkspacesPage() {
    const workspaceList = await getWorkspacesAction();

    return <WorkspacesClient initialWorkspaces={workspaceList} />;
}
