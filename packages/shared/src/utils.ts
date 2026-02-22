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
