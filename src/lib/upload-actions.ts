"use server";

import { db } from "@/lib/db";
import { items } from "@/db/schema";
import { getAIService } from "@/lib/ai/services/factory";
import { parse } from "csv-parse/sync";
import { revalidatePath } from "next/cache";

// Max file size: 4MB
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ONE_MINUTE = 60 * 1000;

import { getWorkspace } from "@/lib/actions";

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
        // Get AI Service
        const ai = await getAIService(workspaceId, "coach");

        // Scenario A: Image (Vision)
        if (mimeType.startsWith("image/")) {
            console.log(`[Upload] Processing image: ${fileName}`);

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

            const result = await ai.chat({
                systemPrompt: "You are a Vision Extraction Bot. Output JSON only.",
                userMessage: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: dataUrl } }
                ],
                temperature: 0.1
            });

            // Parse and Save
            const itemsToSave = parseAIJson(result.content);
            await saveItems(workspaceId, itemsToSave, `upload-image-${fileName}`);

            revalidatePath("/dashboard/knowledge");
            return { success: true, count: itemsToSave.length, type: "image" };
        }

        // Scenario B: CSV (Text)
        if (mimeType === "text/csv" || fileName.endsWith(".csv")) {
            console.log(`[Upload] Processing CSV: ${fileName}`);
            const text = buffer.toString("utf-8");

            // Robust CSV Parsing
            const records = parse(text, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_quotes: true
            });

            const extractedItems = records.map((record: any) => {
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

    const ai = await getAIService(workspaceId, "coach");
    console.log(`[Upload] Generating embeddings for ${itemsList.length} items...`);

    // Process in chunks to avoid rate limits and memory issues
    const CHUNK_SIZE = 10;
    const itemsWithEmbeddings = [];

    for (let i = 0; i < itemsList.length; i += CHUNK_SIZE) {
        const chunk = itemsList.slice(i, i + CHUNK_SIZE);

        // Parallel Usage of AI Service (up to CHUNK_SIZE concurrent requests)
        const promisedEmbeddings = chunk.map(async (item) => {
            try {
                const res = await ai.embed(`${item.name}: ${item.content}`);
                return { ...item, embedding: res.embedding };
            } catch (e) {
                console.warn(`Embedding failed for item ${item.name}`, e);
                return { ...item, embedding: null };
            }
        });

        const chunkResult = await Promise.all(promisedEmbeddings);
        itemsWithEmbeddings.push(...chunkResult);
    }

    console.log(`[Upload] Inserting ${itemsWithEmbeddings.length} items to DB...`);

    // Batch Insert (Single Transaction)
    // Drizzle insert().values() can take an array
    await db.insert(items).values(
        itemsWithEmbeddings.map(item => ({
            workspaceId,
            sourceId,
            name: item.name,
            content: item.content,
            category: item.category || "general",
            meta: item.meta || {},
            embedding: item.embedding
        }))
    );
}
