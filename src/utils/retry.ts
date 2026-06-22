/**
 * Executes a promise-returning function with exponential backoff.
 * @param fn The function to execute.
 * @param maxRetries Maximum number of retries.
 * @param baseDelay Initial delay in milliseconds (default: 1000ms).
 * @returns The result of the function.
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  timeoutMs: number = 15000 // 15 seconds default timeout
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      // Execute the function with a timeout
      return await Promise.race([
        fn(),
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
      ]);
    } catch (error: any) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      
      // Retry on network errors or specific Firebase quota/rate limit errors
      // e.g., 'resource-exhausted' (quota), 'unavailable' (offline/network), 'deadline-exceeded' (timeout)
      const isRetryable = 
        !error.code || 
        error.code === 'resource-exhausted' || 
        error.code === 'unavailable' || 
        error.code === 'deadline-exceeded' ||
        error.status === 429 ||
        error.status === 503 ||
        error.message === 'timeout' ||
        error.message?.toLowerCase().includes('network');
        
      if (!isRetryable) {
        throw error; // Don't retry non-transient errors like 'permission-denied'
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = delay * 0.2 * Math.random(); // Up to 20% jitter
      const sleepTime = delay + jitter;
      
      console.warn(`[Retry] Attempt ${attempt} failed (${error.message}). Retrying in ${Math.round(sleepTime)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }
  throw new Error("Max retries reached");
}
