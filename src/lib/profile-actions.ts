
"use server";

import { db } from "@/lib/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getWorkspace } from "@/lib/actions";

export async function updateProfile(data: {
    businessName: string;
    industry: string;
    about: string;
    targetAudience: string;
    toneOfVoice: string;
}) {
    const workspace = await getWorkspace();
    if (!workspace) throw new Error("Unauthorized");

    await db.update(workspaces)
        .set({
            businessName: data.businessName,
            industry: data.industry,
            about: data.about,
            targetAudience: data.targetAudience,
            toneOfVoice: data.toneOfVoice,
            updatedAt: new Date(),
        })
        .where(eq(workspaces.id, workspace.id));

    revalidatePath("/dashboard/profile");
    return { success: true };
}
