"use server";

import { auth } from "@/lib/auth";
import { db } from "@ebizmate/db";
import { items, workspaces, posts, customers, users } from "@ebizmate/db";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { addItemSchema } from "@/lib/validation";

export async function getWorkspace() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const userWorkspaces = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.userId, session.user.id))
        .limit(1);

    if (userWorkspaces.length > 0) {
        return userWorkspaces[0];
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.name;

    const [newWorkspace] = await db.transaction(async (tx) => {
        // Lazy Sync: Ensure User Exists in Public DB
        // This handles cases where auth-action sync might have failed or user created elsewhere
        const [userExists] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);

        if (!userExists && userEmail) {
            await tx.insert(users).values({
                id: userId,
                name: userName,
                email: userEmail,
                role: "user",
            });
        }

        return await tx.insert(workspaces)
            .values({
                userId: userId,
                name: "My Workspace",
                platform: "generic",
            })
            .returning();
    });

    return newWorkspace;
}

export async function getRecentPosts(limit = 12) {
    const workspace = await getWorkspace();
    if (!workspace) return [];

    return await db
        .select()
        .from(posts)
        .where(eq(posts.workspaceId, workspace.id))
        .orderBy(desc(posts.createdAt))
        .limit(limit);
}

export async function addItem(formData: FormData) {
    const workspace = await getWorkspace();
    if (!workspace) throw new Error("Unauthorized");

    const parsed = addItemSchema.safeParse({
        name: formData.get("name"),
        content: formData.get("content"),
        sourceId: formData.get("sourceId") || null,
    });

    if (!parsed.success) {
        throw new Error(`Validation failed: ${parsed.error.issues.map(i => i.message).join(", ")}`);
    }

    const { name, content, sourceId } = parsed.data;
    const category = (formData.get("category") as string) || "general";

    // Extract Product Metadata
    let meta: any = null;
    if (category === "product") {
        meta = {
            price: formData.get("price") as string,
            discount: formData.get("discount") as string,
            inStock: formData.get("inStock") === "true",
        };
    }

    // Generate embedding via NestJS backend
    let embedding: number[] | null = null;
    try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${backendUrl}/ai/embed`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer system_token_${workspace.id}`
            },
            body: JSON.stringify({
                input: `${name}: ${content}`,
                botType: "coach"
            })
        });

        if (response.ok) {
            const data = await response.json();
            embedding = data.embedding;
        } else {
            console.error("Embedding API failed:", await response.text());
        }
    } catch (error) {
        console.error("Failed to generate embedding for item:", error);
    }

    await db.insert(items).values({
        workspaceId: workspace.id,
        name,
        content,
        sourceId: sourceId ?? null,
        category,
        meta,
        embedding,
    });

    revalidatePath("/dashboard/knowledge");
    return { success: true };
}

export async function updateItem(data: {
    id: string;
    name: string;
    content: string;
    category: string;
    sourceId: string | null;
    price?: string;
    discount?: string;
    inStock?: boolean;
}) {
    const workspace = await getWorkspace();
    if (!workspace) throw new Error("Unauthorized");

    // Re-generate embedding with updated content via NestJS backend
    let embedding: number[] | null = null;
    try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${backendUrl}/ai/embed`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer system_token_${workspace.id}`
            },
            body: JSON.stringify({
                input: `${data.name}: ${data.content}`,
                botType: "coach"
            })
        });

        if (response.ok) {
            const data = await response.json();
            embedding = data.embedding;
        } else {
            console.error("Embedding API failed:", await response.text());
        }
    } catch (error) {
        console.error("Failed to generate embedding for item:", error);
    }

    await db.update(items)
        .set({
            name: data.name,
            content: data.content,
            category: data.category,
            sourceId: data.sourceId,
            meta: data.category === "product" ? { price: data.price, discount: data.discount, inStock: data.inStock } : null,
            embedding,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(items.id, data.id),
                eq(items.workspaceId, workspace.id) // Tenant isolation
            )
        );

    revalidatePath("/dashboard/items");
    return { success: true };
}

export async function deleteItem(itemId: string) {
    const workspace = await getWorkspace();
    if (!workspace) throw new Error("Unauthorized");

    await db.delete(items)
        .where(
            and(
                eq(items.id, itemId),
                eq(items.workspaceId, workspace.id) // Tenant isolation
            )
        );

    revalidatePath("/dashboard/items");
    return { success: true };
}


