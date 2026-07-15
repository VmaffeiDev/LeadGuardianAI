import { prisma, LeadStatus } from "@leadguardian/db";
import { startTriage } from "@leadguardian/core";

// Small batch per tick to stay well under Meta's messaging rate limits.
const BATCH_SIZE = 10;

export async function runStartPendingTriages() {
  const leads = await prisma.lead.findMany({
    where: {
      status: LeadStatus.EM_TRIAGEM,
      triageStartedAt: null,
      whatsappOptOut: false,
      whatsapp: { not: null },
    },
    take: BATCH_SIZE,
    include: {
      tenant: { select: { id: true, whatsappPhoneNumberId: true, whatsappTemplateName: true } },
    },
  });

  if (leads.length === 0) return;

  let started = 0;
  for (const lead of leads) {
    const { whatsappPhoneNumberId, whatsappTemplateName } = lead.tenant;
    if (!whatsappPhoneNumberId || !whatsappTemplateName) {
      console.warn(
        `[worker] tenant ${lead.tenant.id} sem configuração de WhatsApp — pulando lead ${lead.id}`,
      );
      continue;
    }

    try {
      await startTriage(prisma, {
        tenantId: lead.tenantId,
        leadId: lead.id,
        phoneNumberId: whatsappPhoneNumberId,
        templateName: whatsappTemplateName,
      });
      started++;
    } catch (err) {
      console.error(`[worker] falha ao iniciar triagem do lead ${lead.id}:`, err);
    }
  }

  if (started > 0) {
    console.log(`[worker] ${started} triagem(ns) de WhatsApp iniciada(s)`);
  }
}
