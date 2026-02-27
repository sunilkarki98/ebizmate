import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const syncProfileSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1).max(100),
    image: z.string().url().optional(),
});

export class SyncProfileDto extends createZodDto(syncProfileSchema) { }
