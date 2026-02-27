import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const generateEmbeddingSchema = z.object({
    input: z.string().min(1),
    botType: z.enum(['coach', 'customer']),
    interactionId: z.string().optional()
});

export class GenerateEmbeddingDto extends createZodDto(generateEmbeddingSchema) { }
