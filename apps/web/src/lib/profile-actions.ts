
"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace } from "@/lib/item-actions";
import { getBackendToken } from "@/lib/auth";

export async function updateProfile(data: {
    businessName: string;
    industry: string;
    about: string;
    targetAudience: string;
    toneOfVoice: string;
}) {
    const workspace = await getWorkspace();
    if (!workspace) throw new Error("Unauthorized");

    const backendToken = await getBackendToken();
    if (!backendToken) throw new Error("Unauthorized");

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
        const response = await fetch(`${backendUrl}/settings/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${backendToken}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to update profile");
        }

        revalidatePath("/dashboard/profile");
        return { success: true };
    } catch (error: any) {
        throw new Error(error.message || "Failed to update profile");
    }
}
