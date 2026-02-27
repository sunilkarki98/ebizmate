ALTER TABLE "customers" ADD COLUMN "lastCarouselSentAt" timestamp;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "abandonmentStatus" text DEFAULT 'NONE';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "lastPurchaseAt" timestamp;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "images" json;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "url" text;