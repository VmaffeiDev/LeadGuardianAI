import { Queue, Worker, type Job } from "bullmq";
import { bullConnection } from "./redis";

export const IDLE_SCAN_QUEUE = "idle-leads-scan";

export const idleScanQueue = new Queue(IDLE_SCAN_QUEUE, { connection: bullConnection });

/** Registers the repeatable job that drives the idle-lead scan. Idempotent: re-adding with the same jobId just updates the schedule. */
export async function scheduleIdleScan() {
  await idleScanQueue.add(
    "scan",
    {},
    {
      repeat: { every: 30_000 },
      removeOnComplete: true,
      removeOnFail: 50,
      jobId: "idle-leads-scan-repeat",
    },
  );
}

export function createIdleScanWorker(processor: (job: Job) => Promise<void>) {
  return new Worker(IDLE_SCAN_QUEUE, processor, { connection: bullConnection });
}
