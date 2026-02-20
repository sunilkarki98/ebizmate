import { db } from "../src/lib/db";
import { aiSettings } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function checkAdminKey() {
    try {
        console.log("Fetching global AI settings from DB...");

        const settings = await db.query.aiSettings.findFirst({
            where: eq(aiSettings.workspaceId, "global")
        });

        if (!settings) {
            console.log("No global settings found in 'aiSettings' table.");
        } else {
            console.log("--- Global Admin Settings Found ---");
            console.log(`Coach Provider: ${settings.coachProvider} (${settings.coachModel})`);
            console.log(`Customer Provider: ${settings.customerProvider} (${settings.customerModel})`);

            if (settings.geminiApiKey) {
                // Determine if it's raw or encrypted (heuristic: our encryption uses hex string)
                const isEncrypted = /^[0-9a-fA-F]{32,}$/.test(settings.geminiApiKey);
                console.log(`Gemini Key: ${isEncrypted ? "[ENCRYPTED_IN_DB]" : "[RAW_IN_DB]"} (Length: ${settings.geminiApiKey.length})`);
            } else {
                console.log("Gemini Key: NULL");
            }

            if (settings.openaiApiKey) {
                const isEncrypted = /^[0-9a-fA-F]{32,}$/.test(settings.openaiApiKey);
                console.log(`OpenAI Key: ${isEncrypted ? "[ENCRYPTED_IN_DB]" : "[RAW_IN_DB]"} (Length: ${settings.openaiApiKey.length})`);
            } else {
                console.log("OpenAI Key: NULL");
            }

            console.log("-----------------------------------");
        }
    } catch (e) {
        console.error("Failed to query DB:", e);
    }
}

checkAdminKey().then(() => process.exit(0)).catch(() => process.exit(1));
