import { prisma, LeadStatus, LeadTemperature } from "@leadguardian/db";
import { completeTriage } from "@leadguardian/core";

const TIMEOUT_HOURS = 6;

/** Leads that never replied within the timeout window are treated as FRIO. */
export async function runTriageTimeouts() {
  const cutoff = new Date(Date.now() - TIMEOUT_HOURS * 60 * 60 * 1000);

  const leads = await prisma.lead.findMany({
    where: {
      status: LeadStatus.EM_TRIAGEM,
      temperature: null,
      triageStartedAt: { lt: cutoff },
    },
    select: { id: true, tenantId: true },
  });

  if (leads.length === 0) return;

  for (const lead of leads) {
    await completeTriage(prisma, lead.tenantId, lead.id, LeadTemperature.FRIO);
  }

  console.log(`[worker] ${leads.length} lead(s) marcado(s) como FRIO por falta de resposta`);
}
