
import { db } from "./packages/db/src/index.ts";
import { aiSettings } from "./packages/db/src/schema.ts";
import { decrypt } from "./packages/shared/src/crypto.ts";

async function checkGroq() {
    console.log("GROQ_API_KEY in env:", process.env.GROQ_API_KEY ? "Present" : "MISSING");

    try {
        const settings = await db.query.aiSettings.findMany();
        settings.forEach(s => {
            console.log(`\nWorkspace: ${s.workspaceId}`);
            console.log(`- Coach Provider: ${s.coachProvider}`);
            console.log(`- Customer Provider: ${s.customerProvider}`);
            console.log(`- Groq Key in DB: ${s.groqApiKey ? "Present" : "MISSING"}`);
            if (s.groqApiKey) {
                try {
                    decrypt(s.groqApiKey);
                    console.log("- Groq Key Decryption: SUCCESS");
                } catch (e) {
                    console.log("- Groq Key Decryption: FAILED");
                }
            }
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkGroq();
