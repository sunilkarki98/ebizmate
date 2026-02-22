"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logUsage = logUsage;
const db_1 = require("@ebizmate/db");
const db_2 = require("@ebizmate/db");
async function logUsage(workspaceId, interactionId, provider, model, operation, tokens, latencyMs, success, errorMessage) {
    try {
        await db_1.db.insert(db_2.aiUsageLog).values({
            workspaceId,
            interactionId,
            provider,
            model,
            operation,
            inputTokens: tokens.input,
            outputTokens: tokens.output,
            totalTokens: tokens.input + tokens.output,
            latencyMs,
            success,
            errorMessage: errorMessage || null,
        });
    }
    catch (err) {
        console.error("Failed to log AI usage:", err);
    }
}
//# sourceMappingURL=usage.js.map