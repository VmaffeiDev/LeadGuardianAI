import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ?? new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// ioredis logs an "Unhandled error event" to stderr if nothing listens for
// errors — noisy (and misleading) during `next build`, which loads this
// module before Redis is necessarily up. ioredis already retries connections
// on its own; this just keeps failures from looking like a crash.
redis.on("error", (err) => {
  console.error("[redis] connection error:", err.message);
});

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
