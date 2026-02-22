import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
export declare class AiProcessor extends WorkerHost {
    process(job: Job<any, any, string>): Promise<any>;
}
//# sourceMappingURL=ai.processor.d.ts.map