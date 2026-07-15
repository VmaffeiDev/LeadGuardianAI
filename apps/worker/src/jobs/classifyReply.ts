import type { Job } from "bullmq";
import { prisma } from "@leadguardian/db";
import { classifyReply, completeTriage, type ClassifyReplyJobData } from "@leadguardian/core";

/** Runs after apps/web enqueues a job on an inbound WhatsApp reply. */
export async function runClassifyReply(job: Job<ClassifyReplyJobData>) {
  const { tenantId, leadId } = job.data;

  const messages = await prisma.whatsappMessage.findMany({
    where: { tenantId, leadId },
    orderBy: { createdAt: "asc" },
    select: { direction: true, body: true },
  });

  if (messages.length === 0) return;

  const result = await classifyReply(messages);
  await completeTriage(prisma, tenantId, leadId, result.temperature);

  console.log(`[worker] lead ${leadId} classificado como ${result.temperature}: ${result.reasoning}`);
}
