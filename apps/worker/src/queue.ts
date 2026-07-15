import { Queue, Worker, type Job } from "bullmq";
import { WHATSAPP_CLASSIFY_QUEUE } from "@leadguardian/core";
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

export const START_TRIAGES_QUEUE = "start-pending-triages";

export const startTriagesQueue = new Queue(START_TRIAGES_QUEUE, { connection: bullConnection });

/** Sends the initial WhatsApp template to imported leads that haven't been contacted yet. */
export async function scheduleStartPendingTriages() {
  await startTriagesQueue.add(
    "start",
    {},
    {
      repeat: { every: 60_000 },
      removeOnComplete: true,
      removeOnFail: 50,
      jobId: "start-pending-triages-repeat",
    },
  );
}

export function createStartTriagesWorker(processor: (job: Job) => Promise<void>) {
  return new Worker(START_TRIAGES_QUEUE, processor, { connection: bullConnection });
}

export const TRIAGE_TIMEOUTS_QUEUE = "triage-timeouts";

export const triageTimeoutsQueue = new Queue(TRIAGE_TIMEOUTS_QUEUE, { connection: bullConnection });

/** Marks leads that never replied within the timeout window as FRIO. */
export async function scheduleTriageTimeouts() {
  await triageTimeoutsQueue.add(
    "timeout",
    {},
    {
      repeat: { every: 900_000 },
      removeOnComplete: true,
      removeOnFail: 50,
      jobId: "triage-timeouts-repeat",
    },
  );
}

export function createTriageTimeoutsWorker(processor: (job: Job) => Promise<void>) {
  return new Worker(TRIAGE_TIMEOUTS_QUEUE, processor, { connection: bullConnection });
}

// Not scheduled/repeatable — apps/web enqueues one job here per inbound
// WhatsApp reply (see apps/web/src/lib/whatsapp-queue.ts). Queue name comes
// from @leadguardian/core so both sides agree without importing each other.
export function createWhatsappClassifyWorker(processor: (job: Job) => Promise<void>) {
  return new Worker(WHATSAPP_CLASSIFY_QUEUE, processor, { connection: bullConnection });
}
