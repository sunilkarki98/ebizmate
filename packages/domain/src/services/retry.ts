export async function withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number,
    operationName: string,
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxAttempts) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Cap at 10s
                console.warn(`${operationName} attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}
