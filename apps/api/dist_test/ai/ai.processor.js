"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
let AiProcessor = class AiProcessor extends bullmq_1.WorkerHost {
    async process(job) {
        const { name, data } = job;
        try {
            switch (name) {
                case 'process': {
                    // Lazy load to avoid circular dependency issues at boot
                    const { processInteraction } = await Promise.resolve().then(() => __importStar(require('./customer/processor.js')));
                    await processInteraction(data.interactionId);
                    return { success: true };
                }
                case 'ingest': {
                    const { ingestPost } = await Promise.resolve().then(() => __importStar(require('./services/ingestion.js')));
                    await ingestPost(data.postId);
                    return { success: true };
                }
                case 'upload_batch': {
                    const { processBatchIngestion } = await Promise.resolve().then(() => __importStar(require('./services/batch.js')));
                    await processBatchIngestion(data.workspaceId, data.sourceId, data.items);
                    return { success: true };
                }
                default:
                    console.warn(`Unknown AI job type: ${name}`);
                    throw new Error(`Unknown AI job type: ${name}`);
            }
        }
        catch (error) {
            console.error(`AI Processor error on job ${job.id} [${name}]:`, error);
            throw error; // Re-throw allows BullMQ to retry or mark failed
        }
    }
};
exports.AiProcessor = AiProcessor;
exports.AiProcessor = AiProcessor = __decorate([
    (0, bullmq_1.Processor)('ai')
], AiProcessor);
//# sourceMappingURL=ai.processor.js.map