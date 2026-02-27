import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const chatSchema = z.object({
    systemPrompt: z.string().min(1),
    userMessage: z.any(),
    temperature: z.number().optional(),
    botType: z.enum(['coach', 'customer'])
});

export class ChatDto extends createZodDto(chatSchema) { }
