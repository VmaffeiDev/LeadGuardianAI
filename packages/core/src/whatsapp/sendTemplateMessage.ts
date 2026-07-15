import { LeadEventType, WhatsappDirection, type PrismaClient } from "@leadguardian/db";

const WHATSAPP_API_VERSION = "v21.0";

export interface SendTemplateMessageParams {
  tenantId: string;
  leadId: string;
  /** E.164 phone number, e.g. "+5511999998888". */
  to: string;
  phoneNumberId: string;
  templateName: string;
  templateLanguage?: string;
  /** Positional {{1}}, {{2}}... body parameters for the approved template. */
  templateParams?: string[];
}

/**
 * Sends an approved WhatsApp message template via the Meta Cloud API. Meta
 * requires an outbound conversation with a customer who hasn't messaged
 * first to use a pre-approved template — free-form text is rejected.
 *
 * Records the attempt (WhatsappMessage + a WHATSAPP LeadEvent) regardless of
 * outcome, so the lead's timeline always reflects what was actually tried.
 * Throws if the Meta API call itself fails, after recording the failure.
 */
export async function sendTemplateMessage(
  prisma: PrismaClient,
  params: SendTemplateMessageParams,
): Promise<void> {
  const {
    tenantId,
    leadId,
    to,
    phoneNumberId,
    templateName,
    templateLanguage = "pt_BR",
    templateParams = [],
  } = params;

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN não configurado");
  }

  const requestBody = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLanguage },
      ...(templateParams.length > 0
        ? {
            components: [
              {
                type: "body",
                parameters: templateParams.map((text) => ({ type: "text", text })),
              },
            ],
          }
        : {}),
    },
  };

  const res = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
  );

  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  const waMessageId = (data as { messages?: Array<{ id?: string }> })?.messages?.[0]?.id;

  await prisma.whatsappMessage.create({
    data: {
      tenantId,
      leadId,
      direction: WhatsappDirection.OUT,
      body: `Template "${templateName}" enviado`,
      waMessageId,
      status: res.ok ? "sent" : "failed",
    },
  });

  await prisma.leadEvent.create({
    data: {
      leadId,
      type: LeadEventType.WHATSAPP,
      message: res.ok
        ? `WhatsApp enviado: ${templateName}`
        : `Falha ao enviar WhatsApp: ${JSON.stringify(data)}`,
      payload: { direction: "OUT", templateName },
    },
  });

  if (!res.ok) {
    throw new Error(`Falha ao enviar template WhatsApp: ${res.status} ${JSON.stringify(data)}`);
  }
}
