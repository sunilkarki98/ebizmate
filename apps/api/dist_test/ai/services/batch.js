"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processBatchIngestion = processBatchIngestion;
const db_1 = require("@ebizmate/db");
const factory_1 = require("./factory");
async function processBatchIngestion(workspaceId, sourceId, itemsList) {
    if (!itemsList || itemsList.length === 0)
        return;
    // Process in chunks to avoid rate limits and memory issues
    const CHUNK_SIZE = 10;
    const itemsWithEmbeddings = [];
    // Get the Coach AI to generate embeddings
    const ai = await (0, factory_1.getAIService)(workspaceId, "coach");
    for (let i = 0; i < itemsList.length; i += CHUNK_SIZE) {
        const chunk = itemsList.slice(i, i + CHUNK_SIZE);
        const promisedEmbeddings = chunk.map(async (item) => {
            try {
                // Perform embedding internally inside NestJS
                const result = await ai.embed(`${item.name}: ${item.content}`, `batch-${Date.now()}`);
                return { ...item, embedding: result.embedding };
            }
            catch (e) {
                console.warn(`Embedding failed for item ${item.name}`, e);
                return { ...item, embedding: null };
            }
        });
        const chunkResult = await Promise.all(promisedEmbeddings);
        itemsWithEmbeddings.push(...chunkResult);
    }
    console.log(`[Queue] Inserting ${itemsWithEmbeddings.length} items to DB...`);
    // Batch Insert (Single Transaction)
    await db_1.db.insert(db_1.items).values(itemsWithEmbeddings.map(item => ({
        workspaceId,
        sourceId,
        name: item.name,
        content: item.content,
        category: item.category || "general",
        meta: item.meta || {},
        embedding: item.embedding
    })));
}
//# sourceMappingURL=batch.js.map