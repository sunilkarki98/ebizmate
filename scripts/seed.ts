
import "dotenv/config";
import { users } from "@/db/schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
    // Dynamic import ensures dotenv is loaded first
    const { db } = await import("@/lib/db");

    const email = "admin@example.com";
    const password = "password123";

    console.log(`Seeding admin user: ${email}...`);

    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
    });

    if (existingUser) {
        console.log("Admin user already exists.");
        process.exit(0);
    }

    const hashedPassword = await hash(password, 10);

    await db.insert(users).values({
        name: "Admin User",
        email,
        password: hashedPassword,
        role: "admin",
        emailVerified: new Date(),
    });

    console.log("Admin user created successfully.");
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
