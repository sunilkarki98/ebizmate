import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createItemSchema = z.object({
    name: z.string().min(1, "Name is required").max(200, "Name too long"),
    content: z.string().min(1, "Content is required").max(10000, "Content too long"),
    category: z.string().min(1, "Category is required"),
    sourceId: z.string().max(200).nullable().optional(),
    meta: z.record(z.any()).optional(),
    inventoryCount: z.number().int().min(0).optional(),
});

export class CreateItemDto extends createZodDto(createItemSchema) { }

/** Frontend form validation — category and meta handled separately */
export const addItemSchema = z.object({
    name: z.string().min(1, "Name is required").max(200, "Name too long"),
    content: z.string().min(1, "Content is required").max(10000, "Content too long"),
    sourceId: z.string().max(200).nullable().optional(),
});

export const deleteItemSchema = z.object({
    itemId: z.string().min(1),
});

