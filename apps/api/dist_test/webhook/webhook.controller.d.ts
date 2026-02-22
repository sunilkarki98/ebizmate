import { WebhookService } from './webhook.service';
export declare class WebhookController {
    private readonly webhookService;
    constructor(webhookService: WebhookService);
    handleInternalWebhook(platform: string, rawPayload: unknown): Promise<{
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
//# sourceMappingURL=webhook.controller.d.ts.map