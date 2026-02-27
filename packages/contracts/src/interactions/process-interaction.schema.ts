import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const processInteractionSchema = z.object({
    interactionId: z.string().min(1)
});

export class ProcessInteractionDto extends createZodDto(processInteractionSchema) { }
