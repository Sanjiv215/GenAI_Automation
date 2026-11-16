// In-memory sliding window rate limiter (30 requests/minute per API key)
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

export interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(keyId: string): RateLimitCheckResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let record = rateLimitStore.get(keyId);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(keyId, record);
  }

  // Filter out timestamps outside the active sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= MAX_REQUESTS) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterMs = oldestTimestamp + WINDOW_MS - now;
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      allowed: false,
      limit: MAX_REQUESTS,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  record.timestamps.push(now);
  const remaining = MAX_REQUESTS - record.timestamps.length;

  return {
    allowed: true,
    limit: MAX_REQUESTS,
    remaining,
    retryAfterSeconds: 0,
  };
}
