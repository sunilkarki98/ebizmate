import { AiService } from '../ai/ai.service';
import { Queue } from 'bullmq';
export declare class WebhookService {
    private readonly aiService;
    private readonly aiQueue;
    private readonly logger;
    constructor(aiService: AiService, aiQueue: Queue);
    handleWebhookEvent(platform: string, payload: any): Promise<{
        error: string;
        success?: undefined;
        type?: undefined;
        duplicate?: undefined;
        interactionId?: undefined;
        received?: undefined;
    } | {
        success: boolean;
        type: string;
        error?: undefined;
        duplicate?: undefined;
        interactionId?: undefined;
        received?: undefined;
    } | {
        success: boolean;
        duplicate: boolean;
        error?: undefined;
        type?: undefined;
        interactionId?: undefined;
        received?: undefined;
    } | {
        success: boolean;
        interactionId: string;
        error?: undefined;
        type?: undefined;
        duplicate?: undefined;
        received?: undefined;
    } | {
        received: boolean;
        type: any;
        error?: undefined;
        success?: undefined;
        duplicate?: undefined;
        interactionId?: undefined;
    }>;
}
//# sourceMappingURL=webhook.service.d.ts.map