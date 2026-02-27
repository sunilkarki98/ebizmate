
"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace } from "@/lib/item-actions";
import { apiClient } from "@/lib/api-client";

export async function updateProfile(data: {
    businessName: string;
    industry: string;
    about: string;
    targetAudience: string;
    toneOfVoice: string;
}) {
    const workspace = await getWorkspace();
    if (!workspace) throw new Error("Unauthorized");

    await apiClient(`/settings/profile`, {
        method: "PUT",
        body: JSON.stringify(data)
    });

    revalidatePath("/dashboard/profile");
    return { success: true };
}
