CREATE TABLE "accounts" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"activeProvider" text DEFAULT 'openai' NOT NULL,
	"fallbackProvider" text,
	"openaiApiKey" text,
	"openaiModel" text DEFAULT 'gpt-4o-mini',
	"openaiEmbeddingModel" text DEFAULT 'text-embedding-3-small',
	"geminiApiKey" text,
	"geminiModel" text DEFAULT 'gemini-2.0-flash',
	"temperature" text DEFAULT '0.7',
	"maxTokens" integer DEFAULT 1024,
	"topP" text DEFAULT '1.0',
	"systemPromptTemplate" text,
	"rateLimitPerMinute" integer DEFAULT 60,
	"retryAttempts" integer DEFAULT 3,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "ai_settings_workspaceId_unique" UNIQUE("workspaceId")
);
--> statement-breakpoint
CREATE TABLE "ai_usage_log" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"interactionId" text,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"operation" text NOT NULL,
	"inputTokens" integer DEFAULT 0,
	"outputTokens" integer DEFAULT 0,
	"totalTokens" integer DEFAULT 0,
	"latencyMs" integer,
	"success" boolean DEFAULT true NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"action" text NOT NULL,
	"targetType" text,
	"targetId" text,
	"details" json,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"platformId" text NOT NULL,
	"platformHandle" text,
	"name" text,
	"firstInteractionAt" timestamp DEFAULT now(),
	"lastInteractionAt" timestamp DEFAULT now(),
	"aiPaused" boolean DEFAULT false,
	"aiPausedAt" timestamp,
	"conversationState" text DEFAULT 'IDLE',
	"conversationContext" json,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"postId" text,
	"sourceId" text NOT NULL,
	"externalId" text NOT NULL,
	"authorId" text,
	"authorName" text,
	"content" text NOT NULL,
	"response" text,
	"status" text DEFAULT 'PENDING',
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"sourceId" text,
	"name" text NOT NULL,
	"content" text,
	"category" text DEFAULT 'general',
	"meta" json,
	"embedding" vector(768),
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"platformId" text NOT NULL,
	"content" text,
	"transcript" text,
	"meta" json,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "posts_platformId_unique" UNIQUE("platformId")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"password" text,
	"role" text DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"platform" text DEFAULT 'generic',
	"platformId" text,
	"platformHandle" text,
	"accessToken" text,
	"businessName" text,
	"industry" text,
	"about" text,
	"targetAudience" text,
	"toneOfVoice" text,
	"settings" json,
	"allowGlobalAi" boolean DEFAULT true,
	"plan" text DEFAULT 'free',
	"status" text DEFAULT 'active',
	"trialEndsAt" timestamp DEFAULT now(),
	"customUsageLimit" integer,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_interactionId_interactions_id_fk" FOREIGN KEY ("interactionId") REFERENCES "public"."interactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_postId_posts_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_index" ON "accounts" USING btree ("provider","providerAccountId");--> statement-breakpoint
CREATE INDEX "ai_usage_log_workspace_idx" ON "ai_usage_log" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "ai_usage_log_created_idx" ON "ai_usage_log" USING btree ("workspaceId","createdAt");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_platform_idx" ON "customers" USING btree ("workspaceId","platformId");--> statement-breakpoint
CREATE INDEX "interactions_history_idx" ON "interactions" USING btree ("workspaceId","authorId");--> statement-breakpoint
CREATE UNIQUE INDEX "interactions_external_idx" ON "interactions" USING btree ("workspaceId","externalId");--> statement-breakpoint
CREATE INDEX "interactions_status_idx" ON "interactions" USING btree ("workspaceId","status");--> statement-breakpoint
CREATE INDEX "items_sourceId_idx" ON "items" USING btree ("sourceId");--> statement-breakpoint
CREATE INDEX "items_workspaceId_idx" ON "items" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "items_embedding_idx" ON "items" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "verificationToken_identifier_token_index" ON "verificationToken" USING btree ("identifier","token");--> statement-breakpoint
CREATE INDEX "workspaces_user_idx" ON "workspaces" USING btree ("userId");