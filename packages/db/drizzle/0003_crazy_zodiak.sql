ALTER TABLE "workspaces" ADD COLUMN "aiBlocked" boolean DEFAULT false;--> statement-breakpoint
CREATE INDEX "workspaces_platform_idx" ON "workspaces" USING btree ("platformId");