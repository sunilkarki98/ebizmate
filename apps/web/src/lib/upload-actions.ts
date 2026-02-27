"use server";


import { parse } from "csv-parse/sync";
import { revalidatePath } from "next/cache";

// Max file size: 4MB
const MAX_FILE_SIZE = 4 * 1024 * 1024;

import { getWorkspace } from "@/lib/item-actions";
import { apiClient } from "@/lib/api-client";

export async function uploadFileForIngestion(
    formData: FormData
) {
    const workspace = await getWorkspace();
    if (!workspace) return { success: false, error: "Unauthorized" };
    const workspaceId = workspace.id;

    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };
    if (file.size > MAX_FILE_SIZE) return { success: false, error: "File too large (Max 4MB)" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;
    const fileName = file.name;

    try {
        // Scenario A: Image (Vision)
        if (mimeType.startsWith("image/")) {

            // Convert to base64 for Gemini/OpenAI Vision
            const base64 = buffer.toString("base64");
            const dataUrl = `data:${mimeType};base64,${base64}`;

            // Prompt specifically for extraction
            const prompt = `
                Analyze this image of a business document (Menu, Price List, Catalog, or Policy).
                Extract all relevant items into a STRICT JSON Array.
                
                Format:
                [
                    { 
                        "name": "Item Name", 
                        "category": "product" | "service" | "policy", 
                        "content": "Description", 
                        "meta": { "price": "10.00", "url": "https://myshop.com/item" } 
                    }
                ]
            `;

            const payload = {
                systemPrompt: "You are a Vision Extraction Bot. Output JSON only.",
                userMessage: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: dataUrl } }
                ],
                temperature: 0.1,
                botType: "coach"
            };

            const result = await apiClient(`/ai/chat`, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            // Parse and Save
            const itemsToSave = parseAIJson(result.content);
            await saveItems(workspaceId, itemsToSave, `upload-image-${fileName}`);

            revalidatePath("/dashboard/knowledge");
            return { success: true, count: itemsToSave.length, type: "image" };
        }

        // Scenario B: CSV (Text)
        if (mimeType === "text/csv" || fileName.endsWith(".csv")) {
            const text = buffer.toString("utf-8");

            // Robust CSV Parsing
            const records = parse(text, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_quotes: true
            });

            const extractedItems = (records as Record<string, string>[]).map((record) => {
                // Heuristic mapping (case insensitive)
                const keys = Object.keys(record);
                const findKey = (search: string) => keys.find(k => k.toLowerCase().includes(search));

                const nameKey = findKey("name") || findKey("item") || findKey("title") || keys[0];
                const contentKey = findKey("desc") || findKey("detail") || findKey("content") || keys[1];
                const priceKey = findKey("price") || findKey("cost");
                const urlKey = findKey("url") || findKey("link") || findKey("website") || findKey("page");

                const meta: any = {};
                if (priceKey) meta.price = record[priceKey];
                if (urlKey) meta.url = record[urlKey];

                if (!nameKey || !contentKey) return null;

                return {
                    name: record[nameKey] || "Unknown Item",
                    category: "product",
                    content: record[contentKey] || "",
                    meta
                };
            });

            await saveItems(workspaceId, extractedItems, `upload-csv-${fileName}`);
            revalidatePath("/dashboard/knowledge");
            return { success: true, count: extractedItems.length, type: "csv" };
        }

        return { success: false, error: "Unsupported file type. Use Image or CSV." };

    } catch (error: any) {
        console.error("Upload failed:", error);
        return { success: false, error: error.message || "Processing failed" };
    }
}

// Helpers
function parseAIJson(text: string) {
    try {
        const jsonStart = text.indexOf("[");
        const jsonEnd = text.lastIndexOf("]");
        if (jsonStart === -1 || jsonEnd === -1) return [];
        return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    } catch (e) {
        console.error("JSON Parse Error", e);
        return [];
    }
}

async function saveItems(workspaceId: string, itemsList: any[], sourceId: string) {
    if (itemsList.length === 0) return;

    try {
        await apiClient(`/ai/upload-batch`, {
            method: "POST",
            body: JSON.stringify({
                sourceId,
                items: itemsList
            })
        });
    } catch (e) {
        console.error("Failed to enqueue batch upload to backend:", e);
    }
}
