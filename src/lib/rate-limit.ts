// shortcut: em memória, por instância do servidor e zerado a cada restart; trocar por Redis/Upstash antes de rodar mais de uma instância
const buckets = new Map<string, { count: number; resetAt: number }>();

/** Registra uma tentativa e diz se a chave passou do limite na janela. */
export function isRateLimited(key: string, { max = 5, windowMs = 15 * 60_000, now = Date.now() } = {}): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count++;
  return bucket.count > max;
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
