CREATE TABLE "coachConversations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"interactionId" text,
	"content" text NOT NULL,
	"itemsContext" text,
	"status" text DEFAULT 'PENDING',
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN "coachProvider" text DEFAULT 'openai' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN "coachModel" text DEFAULT 'gpt-4o-mini' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN "customerProvider" text DEFAULT 'groq' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN "customerModel" text DEFAULT 'llama-3.3-70b-versatile' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN "openrouterApiKey" text;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN "openrouterModel" text DEFAULT 'meta-llama/llama-3.3-70b-instruct';--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN "groqApiKey" text;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN "groqModel" text DEFAULT 'llama-3.3-70b-versatile';--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "meta" json;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "isVerified" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "relatedItemIds" json;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "expiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "coachConversations" ADD CONSTRAINT "coachConversations_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_queue" ADD CONSTRAINT "feedback_queue_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_queue" ADD CONSTRAINT "feedback_queue_interactionId_interactions_id_fk" FOREIGN KEY ("interactionId") REFERENCES "public"."interactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coachConversations_workspaceId_idx" ON "coachConversations" USING btree ("workspaceId");--> statement-breakpoint
ALTER TABLE "ai_settings" DROP COLUMN "activeProvider";--> statement-breakpoint
ALTER TABLE "ai_settings" DROP COLUMN "fallbackProvider";