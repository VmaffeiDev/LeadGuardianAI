/**
 * Shared between apps/web (enqueues, via a lightweight BullMQ Queue producer
 * — see apps/web/src/lib/whatsapp-queue.ts) and apps/worker (consumes, via
 * createWhatsappClassifyWorker in apps/worker/src/queue.ts), so both sides
 * agree on the queue name without either importing the other.
 */
export const WHATSAPP_CLASSIFY_QUEUE = "whatsapp-classify-reply";

export interface ClassifyReplyJobData {
  tenantId: string;
  leadId: string;
}
