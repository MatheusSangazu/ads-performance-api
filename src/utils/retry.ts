export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 2000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `⚠️ Tentativa ${attempt}/${maxRetries} falhou: ${message}. Retentando em ${delay}ms...`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
