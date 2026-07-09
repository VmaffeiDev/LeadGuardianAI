import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// BullMQ needs a connection with no request retry cap (it manages retries itself).
export const bullConnection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

// Separate plain connection for the Socket.IO redis-emitter. Kept apart from
// BullMQ's connection because BullMQ relies on blocking Redis commands that
// shouldn't share a client with regular pub/sub traffic.
export const pubConnection = new Redis(REDIS_URL);

for (const connection of [bullConnection, pubConnection]) {
  connection.on("error", (err) => {
    console.error("[redis] connection error:", err.message);
  });
}
