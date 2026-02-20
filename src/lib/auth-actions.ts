"use server";

import { db } from "@/lib/db";
import { users, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function loginAction(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
}

export async function loginWithGoogleAction() {
    // This action is client-side initiated mainly, but if we needed a server link:
    // This is a placeholder as client-side SDK handles OAuth redirection best.
    return { error: "Use client-side method" };
}

export async function logoutAction() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/signin");
}

export async function registerAction(formData: FormData) {
    const data = Object.fromEntries(formData.entries());

    // 1. Validate Input
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message };
    }

    const { name, email, password } = parsed.data;

    // 2. Create User in Supabase Auth
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
            },
        },
    });

    if (authError) {
        return { error: authError.message };
    }

    if (!authData.user) {
        return { error: "Registration failed (No user returned)" };
    }

    // 3. Sync to Public DB (Profile & Workspace)
    // We use the SAME ID as Supabase Auth to make joins easy
    const userId = authData.user.id;

    try {
        await db.transaction(async (tx) => {
            // Check if profile exists (idempotency)
            const existing = await tx.query.users.findFirst({
                where: eq(users.id, userId)
            });

            if (!existing) {
                // Insert User Profile
                await tx.insert(users).values({
                    id: userId, // CRITICAL: Use Supabase UUID
                    name,
                    email,
                    role: "user",
                    // No password hash needed here, handled by Supabase
                });

                // Create Default Workspace
                await tx.insert(workspaces).values({
                    userId: userId,
                    name: `${name}'s Workspace`,
                    platform: "generic",
                });
            }
        });

        return { success: true };
    } catch (err) {
        console.error("Sync failed:", err);
        // We warn the user but don't fail the auth if possible, OR fail hard.
        // Failing hard is safer to prevent broken states.
        return { error: "Account created but profile sync failed. Please contact support." };
    }
}
