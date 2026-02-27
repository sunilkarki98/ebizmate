import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ingestPostSchema = z.object({
    postId: z.string().min(1)
});

export class IngestPostDto extends createZodDto(ingestPostSchema) { }
