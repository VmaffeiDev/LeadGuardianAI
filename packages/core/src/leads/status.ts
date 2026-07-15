import { LeadEventType, LeadStatus, type PrismaClient } from "@leadguardian/db";

const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  // System-driven: a lead imported for WhatsApp triage moves to NOVO once
  // classified QUENTE/MORNO and distributed (see whatsapp/triage.ts).
  [LeadStatus.EM_TRIAGEM]: [LeadStatus.NOVO],
  [LeadStatus.NOVO]: [LeadStatus.EM_ATENDIMENTO, LeadStatus.PERDIDO],
  [LeadStatus.EM_ATENDIMENTO]: [LeadStatus.EM_NEGOCIACAO, LeadStatus.PERDIDO],
  [LeadStatus.EM_NEGOCIACAO]: [LeadStatus.GANHO, LeadStatus.PERDIDO, LeadStatus.EM_ATENDIMENTO],
  [LeadStatus.GANHO]: [],
  [LeadStatus.PERDIDO]: [],
};

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Moves a lead to a new status, recording the transition in its timeline.
 * A status change counts as an interaction, so it also resets the idle timer.
 * Throws if the transition isn't allowed by the lead status state machine.
 * `authorId` is omitted for system-driven transitions (e.g. WhatsApp triage
 * completing) — the timeline entry is then recorded without an author.
 */
export async function changeLeadStatus(
  prisma: PrismaClient,
  params: { tenantId: string; leadId: string; to: LeadStatus; authorId?: string; note?: string },
) {
  const { tenantId, leadId, to, authorId, note } = params;

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirstOrThrow({ where: { id: leadId, tenantId } });

    if (!canTransition(lead.status, to)) {
      throw new Error(`Transição de status inválida: ${lead.status} -> ${to}`);
    }

    const updated = await tx.lead.update({
      where: { id: leadId, tenantId },
      data: { status: to, lastInteractionAt: new Date() },
    });

    await tx.leadEvent.create({
      data: {
        leadId,
        authorId,
        type: LeadEventType.STATUS_CHANGE,
        message: note,
        payload: { from: lead.status, to },
      },
    });

    return updated;
  });
}
