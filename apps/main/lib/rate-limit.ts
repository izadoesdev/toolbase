const windowMs = 60_000;
const maxRequests = 60;

const hits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    hits.set(ip, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Prevent memory leak — evict expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now >= entry.resetAt) {
        hits.delete(key);
      }
    }
  }, 5 * 60_000).unref?.();
}
