import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const teachReplySchema = z.object({
    interactionId: z.string().min(1),
    humanResponse: z.string().min(1)
});

export class TeachReplyDto extends createZodDto(teachReplySchema) { }
