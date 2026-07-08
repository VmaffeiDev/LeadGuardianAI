import { LeadEventType, type PrismaClient } from "@leadguardian/db";

/**
 * Registers a real contact attempt with the lead (call, WhatsApp, e-mail,
 * visit...). This is the action that resets the idle timer — plain internal
 * notes do not, since they aren't communication with the lead.
 */
export async function registerLeadContact(
  prisma: PrismaClient,
  params: { tenantId: string; leadId: string; authorId: string; message: string },
) {
  const { tenantId, leadId, authorId, message } = params;

  return prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId, tenantId },
      data: { lastInteractionAt: new Date() },
    });

    return tx.leadEvent.create({
      data: { leadId, authorId, type: LeadEventType.CONTACT, message },
    });
  });
}

/** Adds an internal note to the lead's timeline. Does not reset the idle timer. */
export async function addLeadNote(
  prisma: PrismaClient,
  params: { leadId: string; authorId: string; message: string },
) {
  const { leadId, authorId, message } = params;

  return prisma.leadEvent.create({
    data: { leadId, authorId, type: LeadEventType.NOTE, message },
  });
}
