/**
 * Простое ограничение попыток входа по IP.
 *
 * Живёт в памяти процесса: для одного сервера этого достаточно, чтобы
 * перебор пароля перестал быть бесплатным. При горизонтальном
 * масштабировании счётчик нужно вынести в Redis — отмечено в AGENTS.md.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function loginAllowed(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 0, resetAt: now + WINDOW_MS });
    return true;
  }

  return bucket.count < MAX_ATTEMPTS;
}

export function registerFailedLogin(key: string): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  bucket.count += 1;
}

export function registerSuccessfulLogin(key: string): void {
  buckets.delete(key);
}

/** Заодно не даём карте расти бесконечно на долгоживущем процессе. */
export function pruneLoginBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}
