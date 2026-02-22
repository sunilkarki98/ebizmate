
import { pgTable, text, timestamp, json, integer, uniqueIndex, index, boolean, vector, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Auth (Standard NextAuth/Auth.js) ---
export const users = pgTable("users", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
    password: text("password"),
    role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
});

export const accounts = pgTable(
    "accounts",
    {
        id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
        userId: text("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: text("type").notNull(),
        provider: text("provider").notNull(),
        providerAccountId: text("providerAccountId").notNull(),
        refresh_token: text("refresh_token"),
        access_token: text("access_token"),
        expires_at: integer("expires_at"),
        token_type: text("token_type"),
        scope: text("scope"),
        id_token: text("id_token"),
        session_state: text("session_state"),
    },
    (account) => ({
        compoundKey: uniqueIndex().on(account.provider, account.providerAccountId),
    })
);

export const sessions = pgTable("sessions", {
    sessionToken: text("sessionToken").primaryKey(),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
    "verificationToken",
    {
        identifier: text("identifier").notNull(),
        token: text("token").notNull().unique(),
        expires: timestamp("expires", { mode: "date" }).notNull(),
    },
    (vt) => ({
        compoundKey: uniqueIndex().on(vt.identifier, vt.token),
    })
);

// --- Core SaaS Logic ---

// A "Workspace" represents a Brand, Store, or Client.
export const workspaces = pgTable("workspaces", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),

    // Generic Platform Config
    platform: text("platform").default("generic"), // tiktok, instagram, etc.
    platformId: text("platformId"), // The external ID (e.g., TikTok User ID)
    platformHandle: text("platformHandle"), // The external handle (e.g., @username)
    accessToken: text("accessToken"), // ⚠️ MUST be encrypted via encrypt() before storage

    // Business Profile
    businessName: text("businessName"),
    industry: text("industry"), // e.g., "E-commerce", "Salon", "Real Estate"
    about: text("about"), // "We are a luxury salon..."
    targetAudience: text("targetAudience"), // "Young professionals..."
    toneOfVoice: text("toneOfVoice"), // "Friendly but professional"

    settings: json("settings").$type<{ ai_active?: boolean; language?: string; systemPromptTemplate?: string }>(),

    // Admin Controls
    allowGlobalAi: boolean("allowGlobalAi").default(true), // If false, user must provide their own key

    // Plan & Usage Limits
    plan: text("plan", { enum: ["free", "paid"] }).default("free"),
    status: text("status", { enum: ["active", "suspended", "past_due"] }).default("active"),
    trialEndsAt: timestamp("trialEndsAt").defaultNow(), // Defaults to creation time, logic will add 7 days
    customUsageLimit: integer("customUsageLimit"), // Null = use plan default. 50000 etc.

    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => {
    return {
        userIdx: index("workspaces_user_idx").on(table.userId),
        platformIdx: index("workspaces_platform_idx").on(table.platformId),
    };
});

// "Items" are the knowledge base (Products, FAQs, Services)
export const items = pgTable("items", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),

    sourceId: text("sourceId"), // e.g., TikTok Video ID, Tweet ID, or NULL if global
    name: text("name").notNull(), // Product Name or Topic
    content: text("content"), // Description, Answer, or Details
    category: text("category").default("general"), // e.g., "product", "faq", "policy", "general"

    meta: json("meta"), // Price, Offer codes, extra structured data
    isVerified: boolean("isVerified").default(true),
    relatedItemIds: json("relatedItemIds"), // e.g. ["id1", "id2"]

    // Vector embedding for semantic search (768 dims — native for Gemini, configurable for OpenAI)
    embedding: vector("embedding", { dimensions: 768 }),
    embeddingModel: text("embeddingModel"), // Track which model generated the embedding

    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
    expiresAt: timestamp("expiresAt"), // null = never expires; set for time-limited knowledge (sales, events)
}, (table) => {
    return {
        sourceIdx: index("items_sourceId_idx").on(table.sourceId),
        workspaceIdx: index("items_workspaceId_idx").on(table.workspaceId),
        embeddingIdx: index("items_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
    };
});

// "Posts" store the context of the videos/content
export const posts = pgTable("posts", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),

    platformId: text("platformId").notNull().unique(), // Video ID
    content: text("content"), // Caption, Description
    transcript: text("transcript"), // Video transcript (if available)

    meta: json("meta"), // Tags, duration, timestamps

    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => {
    return {
        workspaceIdx: index("posts_workspaceId_idx").on(table.workspaceId),
    };
});

// "Interactions" track the incoming events and outgoing replies
export const interactions = pgTable("interactions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),

    // Link to local post context if available
    postId: text("postId").references(() => posts.id, { onDelete: "set null" }),

    sourceId: text("sourceId").notNull(), // The context ID (Video ID, Post ID). Redundant if postId is set, but kept for fallback.
    externalId: text("externalId").notNull(), // The Comment ID / Message ID

    authorId: text("authorId"), // Who commented
    authorName: text("authorName"),
    customerId: text("customerId"), // FK link to customers table

    content: text("content").notNull(), // The user's text

    response: text("response"), // What the bot replied
    status: text("status", { enum: ["PENDING", "PROCESSED", "IGNORED", "FAILED", "NEEDS_REVIEW", "ACTION_REQUIRED", "RESOLVED"] }).default("PENDING"),

    meta: json("meta"), // Structured metadata (e.g., escalation references, state machine context)

    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => {
    return {
        // Compound index for fast conversation history retrieval
        historyIdx: index("interactions_history_idx").on(table.workspaceId, table.authorId),
        // Unique compound index for webhook idempotency
        externalIdx: uniqueIndex("interactions_external_idx").on(table.workspaceId, table.externalId),
        // Index for dashboard status queries
        statusIdx: index("interactions_status_idx").on(table.workspaceId, table.status),
        // Index for customer lookups
        customerIdx: index("interactions_customer_idx").on(table.customerId),
    };
});

// "Customers" - People who have interacted with the bot
export const customers = pgTable("customers", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),

    platformId: text("platformId").notNull(), // User ID from TikTok/Insta
    platformHandle: text("platformHandle"), // Username (e.g. @alice)
    name: text("name"), // Real name if known

    firstInteractionAt: timestamp("firstInteractionAt").defaultNow(),
    lastInteractionAt: timestamp("lastInteractionAt").defaultNow(),

    // Human Takeover
    aiPaused: boolean("aiPaused").default(false),
    aiPausedAt: timestamp("aiPausedAt"),

    // State Machine (Deterministic Flows)
    conversationState: text("conversationState").default("IDLE"), // e.g., "AWAITING_ORDER_ID"
    conversationContext: json("conversationContext"), // Store temp data for the flow

    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => {
    return {
        // Ensure one customer record per platform user per workspace
        uniqUser: uniqueIndex("customers_platform_idx").on(table.workspaceId, table.platformId),
    };
});

// --- AI Provider Configuration (per workspace) ---
export const aiSettings = pgTable("ai_settings", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" })
        .unique(), // One config per workspace

    // Coach Bot Routing
    coachProvider: text("coachProvider").notNull().default("openai"), // openai | gemini | openrouter | groq
    coachModel: text("coachModel").notNull().default("gpt-4o-mini"),

    // Customer Bot Routing
    customerProvider: text("customerProvider").notNull().default("groq"), // openai | gemini | openrouter | groq
    customerModel: text("customerModel").notNull().default("llama-3.3-70b-versatile"),

    // OpenAI Config
    openaiApiKey: text("openaiApiKey"), // Encrypted at rest
    openaiModel: text("openaiModel").default("gpt-4o-mini"),
    openaiEmbeddingModel: text("openaiEmbeddingModel").default("text-embedding-3-small"),

    // Gemini Config
    geminiApiKey: text("geminiApiKey"), // Encrypted at rest
    geminiModel: text("geminiModel").default("gemini-2.0-flash"),

    // OpenRouter Config
    openrouterApiKey: text("openrouterApiKey"), // Encrypted at rest
    openrouterModel: text("openrouterModel").default("meta-llama/llama-3.3-70b-instruct"),

    // Groq Config
    groqApiKey: text("groqApiKey"), // Encrypted at rest
    groqModel: text("groqModel").default("llama-3.3-70b-versatile"),

    // Shared Parameters
    temperature: real("temperature").default(0.7),
    maxTokens: integer("maxTokens").default(1024),
    topP: real("topP").default(1.0),

    // Custom system prompt template (optional override)
    systemPromptTemplate: text("systemPromptTemplate"),

    // Rate Limiting & Retry
    rateLimitPerMinute: integer("rateLimitPerMinute").default(60),
    retryAttempts: integer("retryAttempts").default(3),

    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
});

// --- AI Usage Tracking ---
export const aiUsageLog = pgTable("ai_usage_log", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),

    interactionId: text("interactionId")
        .references(() => interactions.id, { onDelete: "set null" }),

    provider: text("provider").notNull(), // openai | gemini
    model: text("model").notNull(),
    operation: text("operation", { enum: ["chat", "embedding", "coach_chat"] }).notNull(),

    inputTokens: integer("inputTokens").default(0),
    outputTokens: integer("outputTokens").default(0),
    totalTokens: integer("totalTokens").default(0),

    latencyMs: integer("latencyMs"),
    success: boolean("success").notNull().default(true),
    errorMessage: text("errorMessage"),

    createdAt: timestamp("createdAt").defaultNow(),
}, (table) => {
    return {
        workspaceIdx: index("ai_usage_log_workspace_idx").on(table.workspaceId),
        createdIdx: index("ai_usage_log_created_idx").on(table.workspaceId, table.createdAt),
    };
});

// --- Feedback Queue ---
export const feedbackQueue = pgTable("feedback_queue", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    interactionId: text("interactionId").references(() => interactions.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    itemsContext: text("itemsContext"),
    status: text("status", { enum: ["PENDING", "PROCESSED", "DISMISSED"] }).default("PENDING"),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
    workspaceStatusIdx: index("feedback_queue_workspace_status_idx").on(table.workspaceId, table.status),
}));

// --- Audit Logs ---
export const auditLogs = pgTable("audit_logs", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // e.g. "settings.updated", "user.role_changed", "escalation.resolved"
    targetType: text("targetType"), // "user" | "workspace" | "settings" | "interaction"
    targetId: text("targetId"),
    details: json("details"), // Additional context
    createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
    createdIdx: index("audit_logs_created_idx").on(table.createdAt),
    userIdx: index("audit_logs_user_idx").on(table.userId),
}));


// ==========================================
// RELATIONS (Defined at the end to avoid Temporal Dead Zone issues)
// ==========================================

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
    user: one(users, {
        fields: [workspaces.userId],
        references: [users.id],
    }),
    items: many(items),
    posts: many(posts),
    interactions: many(interactions),
    customers: many(customers),
    aiSettings: one(aiSettings),
}));

export const itemsRelations = relations(items, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [items.workspaceId],
        references: [workspaces.id],
    }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
    workspace: one(workspaces, {
        fields: [posts.workspaceId],
        references: [workspaces.id],
    }),
    interactions: many(interactions),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [interactions.workspaceId],
        references: [workspaces.id],
    }),
    post: one(posts, {
        fields: [interactions.postId],
        references: [posts.id],
    }),
    customer: one(customers, {
        fields: [interactions.customerId],
        references: [customers.id],
    }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
    workspace: one(workspaces, {
        fields: [customers.workspaceId],
        references: [workspaces.id],
    }),
    interactions: many(interactions),
}));

export const aiSettingsRelations = relations(aiSettings, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [aiSettings.workspaceId],
        references: [workspaces.id],
    }),
}));

export const aiUsageLogRelations = relations(aiUsageLog, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [aiUsageLog.workspaceId],
        references: [workspaces.id],
    }),
    interaction: one(interactions, {
        fields: [aiUsageLog.interactionId],
        references: [interactions.id],
    }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    user: one(users, {
        fields: [auditLogs.userId],
        references: [users.id],
    }),
}));

// "CoachConversations" stores conversation history for the AI Systems Coach
export const coachConversations = pgTable("coachConversations", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "coach"] }).notNull(),
    content: text("content").notNull(),
    sessionId: text("sessionId"), // Group conversation turns into sessions
    createdAt: timestamp("createdAt").defaultNow(),
}, (table) => {
    return {
        workspaceIdx: index("coachConversations_workspaceId_idx").on(table.workspaceId),
        sessionIdx: index("coachConversations_session_idx").on(table.sessionId),
    };
});

export const coachConversationsRelations = relations(coachConversations, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [coachConversations.workspaceId],
        references: [workspaces.id],
    }),
}));
