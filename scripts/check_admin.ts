
import "dotenv/config";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

async function check() {
    // Dynamic import ensures dotenv is loaded first
    const { db } = await import("@/lib/db");

    const email = "admin@example.com";
    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
    });

    if (existingUser) {
        console.log("Admin user FOUND.");
        if (existingUser.password) {
            console.log("Password hash present.");
        } else {
            console.log("Password hash MISSING.");
        }
    } else {
        console.log("Admin user NOT found.");
    }
    process.exit(0);
}

check().catch(console.error);
