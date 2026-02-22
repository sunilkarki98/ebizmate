import { pgTable, index, foreignKey, text, integer, boolean, timestamp, uniqueIndex, json, unique, vector, real } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const aiUsageLog = pgTable("ai_usage_log", {
	id: text().primaryKey().notNull(),
	workspaceId: text().notNull(),
	interactionId: text(),
	provider: text().notNull(),
	model: text().notNull(),
	operation: text().notNull(),
	inputTokens: integer().default(0),
	outputTokens: integer().default(0),
	totalTokens: integer().default(0),
	latencyMs: integer(),
	success: boolean().default(true).notNull(),
	errorMessage: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	index("ai_usage_log_created_idx").using("btree", table.workspaceId.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("text_ops")),
	index("ai_usage_log_workspace_idx").using("btree", table.workspaceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.interactionId],
			foreignColumns: [interactions.id],
			name: "ai_usage_log_interactionId_interactions_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "ai_usage_log_workspaceId_workspaces_id_fk"
		}).onDelete("cascade"),
]);

export const customers = pgTable("customers", {
	id: text().primaryKey().notNull(),
	workspaceId: text().notNull(),
	platformId: text().notNull(),
	platformHandle: text(),
	name: text(),
	firstInteractionAt: timestamp({ mode: 'string' }).defaultNow(),
	lastInteractionAt: timestamp({ mode: 'string' }).defaultNow(),
	aiPaused: boolean().default(false),
	aiPausedAt: timestamp({ mode: 'string' }),
	conversationState: text().default('IDLE'),
	conversationContext: json(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("customers_platform_idx").using("btree", table.workspaceId.asc().nullsLast().op("text_ops"), table.platformId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "customers_workspaceId_workspaces_id_fk"
		}).onDelete("cascade"),
]);

export const posts = pgTable("posts", {
	id: text().primaryKey().notNull(),
	workspaceId: text().notNull(),
	platformId: text().notNull(),
	content: text(),
	transcript: text(),
	meta: json(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	index("posts_workspaceId_idx").using("btree", table.workspaceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "posts_workspaceId_workspaces_id_fk"
		}).onDelete("cascade"),
	unique("posts_platformId_unique").on(table.platformId),
]);

export const items = pgTable("items", {
	id: text().primaryKey().notNull(),
	workspaceId: text().notNull(),
	sourceId: text(),
	name: text().notNull(),
	content: text(),
	category: text().default('general'),
	meta: json(),
	embedding: vector({ dimensions: 768 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
	expiresAt: timestamp({ mode: 'string' }),
	isVerified: boolean().default(true),
	relatedItemIds: json(),
	embeddingModel: text(),
}, (table) => [
	index("items_embedding_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
	index("items_sourceId_idx").using("btree", table.sourceId.asc().nullsLast().op("text_ops")),
	index("items_workspaceId_idx").using("btree", table.workspaceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "items_workspaceId_workspaces_id_fk"
		}).onDelete("cascade"),
]);

export const verificationToken = pgTable("verificationToken", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex().using("btree", table.identifier.asc().nullsLast().op("text_ops"), table.token.asc().nullsLast().op("text_ops")),
	unique("verificationToken_token_unique").on(table.token),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text().notNull(),
	emailVerified: timestamp({ mode: 'string' }),
	image: text(),
	password: text(),
	role: text().default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const sessions = pgTable("sessions", {
	sessionToken: text().primaryKey().notNull(),
	userId: text().notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_userId_users_id_fk"
		}).onDelete("cascade"),
]);

export const auditLogs = pgTable("audit_logs", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	action: text().notNull(),
	targetType: text(),
	targetId: text(),
	details: json(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	index("audit_logs_created_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("audit_logs_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_logs_userId_users_id_fk"
		}).onDelete("cascade"),
]);

export const workspaces = pgTable("workspaces", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	name: text().notNull(),
	platform: text().default('generic'),
	platformId: text(),
	platformHandle: text(),
	accessToken: text(),
	businessName: text(),
	industry: text(),
	about: text(),
	targetAudience: text(),
	toneOfVoice: text(),
	settings: json(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
	allowGlobalAi: boolean().default(true),
	plan: text().default('free'),
	status: text().default('active'),
	trialEndsAt: timestamp({ mode: 'string' }).defaultNow(),
	customUsageLimit: integer(),
}, (table) => [
	index("workspaces_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "workspaces_userId_users_id_fk"
		}).onDelete("cascade"),
]);

export const feedbackQueue = pgTable("feedback_queue", {
	id: text().primaryKey().notNull(),
	workspaceId: text().notNull(),
	interactionId: text(),
	content: text().notNull(),
	itemsContext: text(),
	status: text().default('PENDING'),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	index("feedback_queue_workspace_status_idx").using("btree", table.workspaceId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.interactionId],
			foreignColumns: [interactions.id],
			name: "feedback_queue_interactionId_interactions_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "feedback_queue_workspaceId_workspaces_id_fk"
		}).onDelete("cascade"),
]);

export const aiSettings = pgTable("ai_settings", {
	id: text().primaryKey().notNull(),
	workspaceId: text().notNull(),
	openaiApiKey: text(),
	openaiModel: text().default('gpt-4o-mini'),
	openaiEmbeddingModel: text().default('text-embedding-3-small'),
	geminiApiKey: text(),
	geminiModel: text().default('gemini-2.0-flash'),
	temperature: real().default(0.7),
	maxTokens: integer().default(1024),
	topP: real().default(1),
	systemPromptTemplate: text(),
	rateLimitPerMinute: integer().default(60),
	retryAttempts: integer().default(3),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
	openrouterApiKey: text(),
	openrouterModel: text().default('meta-llama/llama-3.3-70b-instruct'),
	groqApiKey: text(),
	groqModel: text().default('llama-3.3-70b-versatile'),
	coachProvider: text().default('openai').notNull(),
	coachModel: text().default('gpt-4o-mini').notNull(),
	customerProvider: text().default('groq').notNull(),
	customerModel: text().default('llama-3.3-70b-versatile').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "ai_settings_workspaceId_workspaces_id_fk"
		}).onDelete("cascade"),
	unique("ai_settings_workspaceId_unique").on(table.workspaceId),
]);

export const accounts = pgTable("accounts", {
	userId: text().notNull(),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text().notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	scope: text(),
	idToken: text("id_token"),
	sessionState: text("session_state"),
	id: text().primaryKey().notNull(),
}, (table) => [
	uniqueIndex().using("btree", table.provider.asc().nullsLast().op("text_ops"), table.providerAccountId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_userId_users_id_fk"
		}).onDelete("cascade"),
]);

export const coachConversations = pgTable("coachConversations", {
	id: text().primaryKey().notNull(),
	workspaceId: text().notNull(),
	role: text().notNull(),
	content: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	sessionId: text(),
}, (table) => [
	index("coachConversations_session_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("coachConversations_workspaceId_idx").using("btree", table.workspaceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "coachConversations_workspaceId_workspaces_id_fk"
		}).onDelete("cascade"),
]);

export const interactions = pgTable("interactions", {
	id: text().primaryKey().notNull(),
	workspaceId: text().notNull(),
	postId: text(),
	sourceId: text().notNull(),
	externalId: text().notNull(),
	authorId: text(),
	authorName: text(),
	content: text().notNull(),
	response: text(),
	status: text().default('PENDING'),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	meta: json(),
	customerId: text(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	index("interactions_customer_idx").using("btree", table.customerId.asc().nullsLast().op("text_ops")),
	uniqueIndex("interactions_external_idx").using("btree", table.workspaceId.asc().nullsLast().op("text_ops"), table.externalId.asc().nullsLast().op("text_ops")),
	index("interactions_history_idx").using("btree", table.workspaceId.asc().nullsLast().op("text_ops"), table.authorId.asc().nullsLast().op("text_ops")),
	index("interactions_status_idx").using("btree", table.workspaceId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "interactions_postId_posts_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "interactions_workspaceId_workspaces_id_fk"
		}).onDelete("cascade"),
]);
