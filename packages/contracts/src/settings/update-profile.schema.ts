import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const updateProfileSchema = z.object({
    businessName: z.string().min(1),
    industry: z.string().optional(),
    about: z.string().optional(),
    targetAudience: z.string().optional(),
    toneOfVoice: z.string().optional()
});

export class UpdateProfileDto extends createZodDto(updateProfileSchema) { }
