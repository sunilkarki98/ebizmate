CREATE TABLE "item_relations" (
	"itemId" text NOT NULL,
	"relatedItemId" text NOT NULL,
	CONSTRAINT "item_relations_itemId_relatedItemId_pk" PRIMARY KEY("itemId","relatedItemId")
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "inventoryCount" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shippingStatus" text DEFAULT 'processing';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "trackingUrl" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "autopilotMode" text DEFAULT 'ALWAYS_ON';--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "timezone" text DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "businessHoursStart" text DEFAULT '09:00';--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "businessHoursEnd" text DEFAULT '17:00';--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "maxHumanCapacity" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "item_relations" ADD CONSTRAINT "item_relations_itemId_items_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_relations" ADD CONSTRAINT "item_relations_relatedItemId_items_id_fk" FOREIGN KEY ("relatedItemId") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_relations_reverse_idx" ON "item_relations" USING btree ("relatedItemId");--> statement-breakpoint
CREATE INDEX "items_name_trgm_idx" ON "items" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "items_content_trgm_idx" ON "items" USING gin ("content" gin_trgm_ops);