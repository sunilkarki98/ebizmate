"use server";

import { getBackendToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { addItemSchema } from "@/lib/validation";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function getWorkspace() {
    const backendToken = await getBackendToken();
    if (!backendToken) return null;

    try {
        const response = await fetch(`${backendUrl}/items/workspace`, {
            headers: {
                "Authorization": `Bearer ${backendToken}`
            }
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        return null;
    }
}

export async function getRecentPosts(limit = 12) {
    const backendToken = await getBackendToken();
    if (!backendToken) return [];

    try {
        const response = await fetch(`${backendUrl}/items/posts?limit=${limit}`, {
            headers: {
                "Authorization": `Bearer ${backendToken}`
            }
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        return [];
    }
}

export async function addItem(formData: FormData) {
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

    let meta: any = null;
    if (category === "product") {
        meta = {
            price: formData.get("price") as string,
            discount: formData.get("discount") as string,
            inStock: formData.get("inStock") === "true",
        };
    }

    const backendToken = await getBackendToken();
    if (!backendToken) throw new Error("Unauthorized");

    try {
        const response = await fetch(`${backendUrl}/items`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${backendToken}`
            },
            body: JSON.stringify({
                name,
                content,
                sourceId,
                category,
                meta
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to add item");
        }

        revalidatePath("/dashboard/knowledge");
        return { success: true };
    } catch (error: any) {
        throw new Error(error.message || "Failed to add item");
    }
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
    const backendToken = await getBackendToken();
    if (!backendToken) throw new Error("Unauthorized");

    const meta = data.category === "product" ? { price: data.price, discount: data.discount, inStock: data.inStock } : undefined;

    try {
        const response = await fetch(`${backendUrl}/items/${data.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${backendToken}`
            },
            body: JSON.stringify({
                name: data.name,
                content: data.content,
                sourceId: data.sourceId,
                category: data.category,
                meta
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to update item");
        }

        revalidatePath("/dashboard/items");
        return { success: true };
    } catch (error: any) {
        throw new Error(error.message || "Failed to update item");
    }
}

export async function deleteItem(itemId: string) {
    const backendToken = await getBackendToken();
    if (!backendToken) throw new Error("Unauthorized");

    try {
        const response = await fetch(`${backendUrl}/items/${itemId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${backendToken}`
            }
        });

        if (!response.ok) {
            throw new Error("Failed to delete item");
        }

        revalidatePath("/dashboard/items");
        return { success: true };
    } catch (error: any) {
        throw new Error(error.message || "Failed to delete item");
    }
}
