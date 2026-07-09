import { redis } from "./redis";

/**
 * Fixed-window rate limiter backed by Redis (shared across web replicas).
 * Returns true if the action is still allowed under `limit` hits per
 * `windowSeconds`. Used to slow down brute-force login attempts.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const redisKey = `ratelimit:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSeconds);
  }
  return count <= limit;
}
