import { z } from "zod";

export const AutopilotModeSchema = z.enum(["ALWAYS_ON", "AFTER_HOURS", "OVERFLOW", "OFF"]);
export type AutopilotMode = z.infer<typeof AutopilotModeSchema>;

export const UpdateAutopilotSettingsSchema = z.object({
    autopilotMode: AutopilotModeSchema,
    timezone: z.string().min(1, "Timezone is required"),
    businessHoursStart: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Must be HH:mm 24-hour format"),
    businessHoursEnd: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Must be HH:mm 24-hour format"),
    maxHumanCapacity: z.number().int().min(1).max(100),
});

export type UpdateAutopilotSettings = z.infer<typeof UpdateAutopilotSettingsSchema>;
