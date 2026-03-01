ALTER TABLE "orders" ALTER COLUMN "totalAmount" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "usedTokens" integer DEFAULT 0;