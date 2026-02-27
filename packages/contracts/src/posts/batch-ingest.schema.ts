import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const batchIngestSchema = z.object({
    sourceId: z.string().min(1),
    items: z.array(z.any())
});

export class BatchIngestDto extends createZodDto(batchIngestSchema) { }
