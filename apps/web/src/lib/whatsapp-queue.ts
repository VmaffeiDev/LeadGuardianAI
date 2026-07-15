import { Queue } from "bullmq";
import Redis from "ioredis";
import { WHATSAPP_CLASSIFY_QUEUE, type ClassifyReplyJobData } from "@leadguardian/core";

const bullConnection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
bullConnection.on("error", (err) => console.error("[redis] connection error:", err.message));

const queue = new Queue(WHATSAPP_CLASSIFY_QUEUE, { connection: bullConnection });

/** Enqueues a job for apps/worker to classify a lead's WhatsApp reply. */
export async function enqueueClassifyReply(data: ClassifyReplyJobData): Promise<void> {
  await queue.add("classify", data, { removeOnComplete: true, removeOnFail: 50 });
}
