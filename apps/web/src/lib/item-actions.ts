"use server";

import { revalidatePath } from "next/cache";
import { addItemSchema, updateItemSchema, deleteItemSchema } from "@/lib/validation";
import { apiClient } from "@/lib/api-client";

export async function getWorkspace() {
    try {
        return await apiClient("/items/workspace");
    } catch {
        return null;
    }
}

export async function getRecentPosts(limit = 12) {
    try {
        return await apiClient(`/items/posts?limit=${limit}`);
    } catch {
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

    try {
        await apiClient(`/items`, {
            method: "POST",
            body: JSON.stringify({ name, content, sourceId, category, meta })
        });
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
    const validated = updateItemSchema.parse(data);

    const meta = validated.category === "product" ? {
        price: validated.price,
        discount: validated.discount,
        inStock: validated.inStock
    } : undefined;

    try {
        await apiClient(`/items/${validated.id}`, {
            method: "PUT",
            body: JSON.stringify({
                name: validated.name,
                content: validated.content,
                sourceId: validated.sourceId,
                category: validated.category,
                meta
            })
        });
        revalidatePath("/dashboard/knowledge");
        return { success: true };
    } catch (error: any) {
        throw new Error(error.message || "Failed to update item");
    }
}

export async function deleteItem(itemId: string) {
    const validated = deleteItemSchema.parse({ itemId });
    try {
        await apiClient(`/items/${validated.itemId}`, {
            method: "DELETE"
        });
        revalidatePath("/dashboard/knowledge");
        return { success: true };
    } catch (error: any) {
        throw new Error(error.message || "Failed to delete item");
    }
}
