
import "dotenv/config";
import { users } from "@/db/schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
    const { db } = await import("@/lib/db");

    const email = "admin@example.com";
    const password = "password123";

    console.log(`Resetting password for: ${email}...`);

    const hashedPassword = await hash(password, 10);

    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
    });

    if (existingUser) {
        await db.update(users)
            .set({ password: hashedPassword, role: 'admin' })
            .where(eq(users.email, email));
        console.log("Password updated successfully.");
    } else {
        console.log("User not found, creating...");
        await db.insert(users).values({
            name: "Admin User",
            email,
            password: hashedPassword,
            role: "admin",
            emailVerified: new Date(),
        });
        console.log("Admin user created.");
    }
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
