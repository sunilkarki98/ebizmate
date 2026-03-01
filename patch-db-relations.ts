import "dotenv/config";
import { db, items, itemRelations } from "@ebizmate/db";
import { isNotNull } from "drizzle-orm";

async function run() {
    console.log("--- Migrating relatedItemIds JSON to item_relations junction table ---");

    try {
        // Find items that might have relatedItemIds
        const allItems = await db.query.items.findMany({
            where: isNotNull(items.relatedItemIds),
            columns: { id: true, relatedItemIds: true }
        });

        console.log(`Found ${allItems.length} items that might have relations...`);

        let migratedCount = 0;

        for (const item of allItems) {
            const relatedIds = item.relatedItemIds as string[] | null;
            if (Array.isArray(relatedIds) && relatedIds.length > 0) {
                // Insert into item_relations
                for (const rId of relatedIds) {
                    await db.insert(itemRelations).values({
                        itemId: item.id,
                        relatedItemId: rId
                    }).onConflictDoNothing();
                    migratedCount++;
                }
            }
        }

        console.log(`Successfully migrated ${migratedCount} relation pairs!`);
        console.log("You can now safely drop the relatedItemIds JSON column when ready.");

    } catch (e) {
        console.error("Migration script failed:", e);
    }

    process.exit(0);
}

run();
