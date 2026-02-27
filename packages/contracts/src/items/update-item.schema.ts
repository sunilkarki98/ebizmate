import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const updateItemSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    content: z.string().max(10000).optional(),
    category: z.string().optional(),
    sourceId: z.string().max(200).optional(),
    meta: z.record(z.string(), z.any()).optional()
});

export class UpdateItemDto extends createZodDto(updateItemSchema) { }

/** Frontend form validation — includes id and product-specific fields */
export const updateItemFullSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1, "Name is required").max(200, "Name too long"),
    content: z.string().min(1, "Content is required").max(10000, "Content too long"),
    category: z.string().min(1),
    sourceId: z.string().max(200).nullable().optional(),
    price: z.string().optional(),
    discount: z.string().optional(),
    inStock: z.boolean().optional(),
});

