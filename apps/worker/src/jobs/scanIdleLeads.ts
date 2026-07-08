import { prisma } from "@leadguardian/db";
import { evaluateIdleLeads } from "@leadguardian/core";
import { publishLeadAlert } from "../realtime-publisher";

export async function runIdleLeadsScan() {
  const triggered = await evaluateIdleLeads(prisma);
  if (triggered.length === 0) return;

  const leads = await prisma.lead.findMany({
    where: { id: { in: triggered.map((t) => t.leadId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(leads.map((l) => [l.id, l.name]));

  for (const alert of triggered) {
    await publishLeadAlert(alert, nameById.get(alert.leadId) ?? "Lead");
  }

  console.log(`[worker] ${triggered.length} alerta(s) disparado(s)`);
}
