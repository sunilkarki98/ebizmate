import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const coachHistoryEntrySchema = z.object({
    role: z.enum(['user', 'coach']),
    content: z.string().min(1)
});

export const coachChatSchema = z.object({
    message: z.string().min(1),
    history: z.array(coachHistoryEntrySchema)
});

export class CoachChatDto extends createZodDto(coachChatSchema) { }
