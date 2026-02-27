import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const validPlatforms = ['generic', 'tiktok', 'instagram', 'facebook', 'whatsapp'] as const;

export const updateIdentitySchema = z.object({
    workspaceName: z.string().min(2),
    platform: z.enum(validPlatforms),
    platformHandle: z.string().optional()
});

export class UpdateIdentityDto extends createZodDto(updateIdentitySchema) { }
