
import { getWorkspace } from "@/lib/actions";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const workspace = await getWorkspace();

    if (!workspace) {
        redirect("/signin");
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Business Profile</h1>
                    <p className="text-muted-foreground">
                        Tell the AI about your business so it can represent you accurately.
                    </p>
                </div>
            </div>
            <ProfileForm initialData={workspace} />
        </div>
    );
}
