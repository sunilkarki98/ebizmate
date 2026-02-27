"use server";

import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiClient } from "@/lib/api-client";

const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function loginAction(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabase = await createClient();

    if (!supabase) {
        return { error: "Failed to initialize auth client" };
    }

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



export async function logoutAction() {
    const supabase = await createClient();
    if (supabase) {
        await supabase.auth.signOut();
    }
    redirect("/signin");
}

export async function registerAction(formData: FormData) {
    const data = Object.fromEntries(formData.entries());

    // 1. Validate Input
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const { name, email, password } = parsed.data;

    // 2. Create User in Supabase Auth
    const supabase = await createClient();

    if (!supabase) {
        return { error: "Failed to initialize auth client" };
    }

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

    // 3. Sync to Public DB via API
    try {
        await apiClient(`/auth/sync`, {
            method: "POST",
            requireAuth: false,
            headers: {
                // Supabase JWT created upon successful signup 
                'Authorization': `Bearer ${authData.session?.access_token || ''}`
            },
            body: JSON.stringify({ email, name })
        });

        return { success: true };
    } catch (err) {
        console.error("Sync failed:", err);
        return { error: "Account created but profile sync failed. Please contact support." };
    }
}
