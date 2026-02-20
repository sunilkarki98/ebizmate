import { db } from "./src/lib/db";
import { workspaces } from "./src/db/schema";

async function run() {
    const w = await db.select({
        id: workspaces.id,
        name: workspaces.name,
        businessName: workspaces.businessName,
        industry: workspaces.industry,
        tone: workspaces.toneOfVoice
    }).from(workspaces).limit(5);

    console.log(JSON.stringify(w, null, 2));
    process.exit(0);
}

run();
