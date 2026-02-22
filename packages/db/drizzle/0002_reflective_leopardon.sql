ALTER TABLE "ai_settings" ALTER COLUMN "temperature" SET DATA TYPE real USING temperature::real;--> statement-breakpoint
ALTER TABLE "ai_settings" ALTER COLUMN "temperature" SET DEFAULT 0.7;--> statement-breakpoint
ALTER TABLE "ai_settings" ALTER COLUMN "topP" SET DATA TYPE real USING "topP"::real;--> statement-breakpoint
ALTER TABLE "ai_settings" ALTER COLUMN "topP" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "id" text PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "coachConversations" ADD COLUMN "sessionId" text;--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "customerId" text;--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "updatedAt" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "embeddingModel" text;--> statement-breakpoint
CREATE INDEX "coachConversations_session_idx" ON "coachConversations" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "feedback_queue_workspace_status_idx" ON "feedback_queue" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE INDEX "interactions_customer_idx" ON "interactions" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "posts_workspaceId_idx" ON "posts" USING btree ("workspaceId");