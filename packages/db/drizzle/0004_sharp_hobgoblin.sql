CREATE TABLE "clarification_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"interactionId" text,
	"customerId" text,
	"customerMessage" text NOT NULL,
	"detectedIntent" text,
	"generatedQuestion" text NOT NULL,
	"sellerReply" text,
	"extractedKnowledge" json,
	"status" text DEFAULT 'pending',
	"createdAt" timestamp DEFAULT now(),
	"resolvedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"customerId" text,
	"interactionId" text,
	"orderItems" json,
	"totalAmount" real,
	"currency" text DEFAULT 'NPR',
	"customerName" text,
	"customerPlatformId" text,
	"customerMessage" text,
	"status" text DEFAULT 'pending',
	"serviceType" text,
	"preferredTime" text,
	"phoneNumber" text,
	"customerNote" text,
	"sellerNote" text,
	"sellerProposal" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	"confirmedAt" timestamp,
	"completedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN "geminiEmbeddingModel" text DEFAULT 'gemini-embedding-001';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "preferencesSummary" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "latestMessagePreview" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "needsReviewCount" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "clarification_tickets" ADD CONSTRAINT "clarification_tickets_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clarification_tickets" ADD CONSTRAINT "clarification_tickets_interactionId_interactions_id_fk" FOREIGN KEY ("interactionId") REFERENCES "public"."interactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clarification_tickets" ADD CONSTRAINT "clarification_tickets_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_interactionId_interactions_id_fk" FOREIGN KEY ("interactionId") REFERENCES "public"."interactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clarification_tickets_workspace_status_idx" ON "clarification_tickets" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE INDEX "clarification_tickets_interaction_idx" ON "clarification_tickets" USING btree ("interactionId");--> statement-breakpoint
CREATE INDEX "orders_workspace_status_idx" ON "orders" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customerId");