/**
 * CoachHelper V4 - Enhanced KB Verification & Linking
 *
 * Features:
 * 1. Marks unverified items as verified
 * 2. Links related items using AI + semantic similarity
 * 3. Computes vector embeddings for better matching
 * 4. Handles batch processing with concurrency
 * 5. Logs progress & errors robustly
 */
export declare function linkAndVerifyKB(workspaceId: string, batchSize?: number): Promise<void>;
export declare function ingestPost(postId: string): Promise<void>;
//# sourceMappingURL=ingestion.d.ts.map