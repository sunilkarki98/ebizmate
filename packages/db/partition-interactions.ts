import { db } from "./src/index.js";
import { sql } from "drizzle-orm";

/**
 * Implements Automated Monthly Range Partitioning for the interactions table.
 * 
 * 1. Renames the old interactions table.
 * 2. Creates a new natively partitioned interactions table based on `createdAt`.
 * 3. Migrates the data.
 * 4. Creates a `default` partition and partitions for the current and next month.
 */
async function partitionInteractions() {
    console.log("🚀 Starting declarative partitioning of `interactions` table...");

    try {
        // Step 1: Explicitly check if the table is already partitioned
        const check = await db.execute(sql`
            SELECT relkind FROM pg_class WHERE relname = 'interactions';
        `);
        if (check.rows[0]?.relkind === 'p') {
            console.log("✅ Table is already partitioned. Skipping.");
            return;
        }

        console.log("📦 Renaming existing table to interactions_old...");
        await db.execute(sql`ALTER TABLE interactions RENAME TO interactions_old;`);

        console.log("🔨 Creating new partitioned interactions table...");
        await db.execute(sql`
            CREATE TABLE interactions (
                id text NOT NULL,
                "workspaceId" text NOT NULL,
                "postId" text,
                "sourceId" text NOT NULL,
                "externalId" text NOT NULL,
                "authorId" text,
                "authorName" text,
                "customerId" text,
                content text NOT NULL,
                response text,
                status text DEFAULT 'PENDING',
                meta json,
                "createdAt" timestamp DEFAULT now() NOT NULL,
                "updatedAt" timestamp DEFAULT now(),
                PRIMARY KEY (id, "createdAt") 
            ) PARTITION BY RANGE ("createdAt");
        `);

        console.log("📅 Creating Monthly Partitions...");
        // Creates the default catch-all and explicitly defines this month and next month.
        // In a production environment, cron (e.g., pg_cron or BullMQ job) would generate upcoming months.
        await db.execute(sql`
            CREATE TABLE interactions_default PARTITION OF interactions DEFAULT;
            CREATE TABLE interactions_y2026m02 PARTITION OF interactions FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
            CREATE TABLE interactions_y2026m03 PARTITION OF interactions FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
            CREATE TABLE interactions_y2026m04 PARTITION OF interactions FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
        `);

        // Reattach foreign keys constraints that were lost in raw recreation
        console.log("🔗 Re-attaching Foreign Key Constraints...");
        await db.execute(sql`
            ALTER TABLE interactions ADD CONSTRAINT interactions_workspaceid_fkey FOREIGN KEY ("workspaceId") REFERENCES workspaces(id) ON DELETE CASCADE;
            ALTER TABLE interactions ADD CONSTRAINT interactions_postid_fkey FOREIGN KEY ("postId") REFERENCES posts(id) ON DELETE SET NULL;
            ALTER TABLE interactions ADD CONSTRAINT interactions_customerid_fkey FOREIGN KEY ("customerId") REFERENCES customers(id) ON DELETE SET NULL;
        `);

        console.log("🚚 Migrating historic data into partitioned table...");
        await db.execute(sql`
            INSERT INTO interactions SELECT * FROM interactions_old;
        `);

        console.log("🗑️ Dropping old flat table...");
        await db.execute(sql`DROP TABLE interactions_old CASCADE;`);

        console.log("✅ Partitioning Migration Complete!");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    }
}

partitionInteractions().then(() => process.exit(0));
