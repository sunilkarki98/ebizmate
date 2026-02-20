
import { db } from "@/lib/db";
import { workspaces } from "@/db/schema";

async function main() {
    const all = await db.query.workspaces.findMany();
    console.log(JSON.stringify(all, null, 2));
    process.exit(0);
}

main();
