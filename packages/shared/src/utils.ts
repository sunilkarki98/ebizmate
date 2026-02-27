/**
 * Escapes special characters in a string for use in PostgreSQL ILIKE patterns.
 * Prevents SQL injection via wildcard characters.
 */
export function sanitizeLikeInput(input: string): string {
    return input
        .replace(/\\/g, "\\\\") // Escape backslash first
        .replace(/%/g, "\\%")   // Escape percent
        .replace(/_/g, "\\_");  // Escape underscore
}

export function parseDuration(durationStr?: string): Date | null {
    if (!durationStr) return null;
    const match = durationStr.match(/^(\d+)([dhwmy])$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    const date = new Date();
    if (unit === 'h') date.setHours(date.getHours() + value);
    if (unit === 'd') date.setDate(date.getDate() + value);
    if (unit === 'w') date.setDate(date.getDate() + value * 7);
    if (unit === 'm') date.setMonth(date.getMonth() + value);
    if (unit === 'y') date.setFullYear(date.getFullYear() + value);
    return date;
}

/**
 * Strip any residual function/XML tags from text that couldn't be parsed.
 * This ensures the user NEVER sees raw <function(...)> tags in the chat.
 * Used globally as a final outbound filter.
 */
export function stripResidualFunctionTags(text: string): string {
    return text
        .replace(/<function[=(][^>]*>[\s\S]*?<\/function>/gi, "")
        .replace(/<\/?function[^>]*>/gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
