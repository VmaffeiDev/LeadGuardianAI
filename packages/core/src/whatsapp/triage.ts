import { LeadStatus, LeadTemperature, type PrismaClient } from "@leadguardian/db";
import { assignNextVendedor } from "../leads/distribution";
import { changeLeadStatus } from "../leads/status";
import { sendTemplateMessage } from "./sendTemplateMessage";

export interface StartTriageParams {
  tenantId: string;
  leadId: string;
  phoneNumberId: string;
  templateName: string;
}

/** Sends the initial WhatsApp template to a lead in EM_TRIAGEM and marks `triageStartedAt`. */
export async function startTriage(prisma: PrismaClient, params: StartTriageParams): Promise<void> {
  const { tenantId, leadId, phoneNumberId, templateName } = params;

  const lead = await prisma.lead.findFirstOrThrow({ where: { id: leadId, tenantId } });
  if (!lead.whatsapp) {
    throw new Error(`Lead ${leadId} não tem número de WhatsApp`);
  }

  await sendTemplateMessage(prisma, {
    tenantId,
    leadId,
    to: lead.whatsapp,
    phoneNumberId,
    templateName,
    templateParams: [lead.name, lead.carInterest ?? "nosso estoque"],
  });

  await prisma.lead.update({
    where: { id: leadId, tenantId },
    data: { triageStartedAt: new Date() },
  });
}

/**
 * Records the lead's triage outcome. QUENTE/MORNO move EM_TRIAGEM -> NOVO and
 * get distributed immediately through the same round-robin used everywhere
 * else (assignNextVendedor) — no separate "priority" distribution path, the
 * urgency is surfaced in the UI instead. FRIO stays in EM_TRIAGEM, untouched,
 * visible to the gestor for a manual call.
 */
export async function completeTriage(
  prisma: PrismaClient,
  tenantId: string,
  leadId: string,
  temperature: LeadTemperature,
): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId, tenantId },
    data: { temperature },
  });

  if (temperature === LeadTemperature.FRIO) {
    return;
  }

  await changeLeadStatus(prisma, {
    tenantId,
    leadId,
    to: LeadStatus.NOVO,
    note: `Triagem via WhatsApp concluída: ${temperature}`,
  });

  await assignNextVendedor(prisma, tenantId, leadId);
}
