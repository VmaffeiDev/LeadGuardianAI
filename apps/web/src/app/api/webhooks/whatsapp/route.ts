import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma, WhatsappDirection, LeadEventType } from "@leadguardian/db";
import { normalizeWhatsappPhone } from "@leadguardian/core";
import { enqueueClassifyReply } from "@/lib/whatsapp-queue";

const OPT_OUT_KEYWORDS = ["parar", "sair", "cancelar", "não perturbe", "nao perturbe", "descadastr"];

/** Meta's subscription handshake — echoes hub.challenge back if the verify token matches. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;

  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== receivedBuf.length) return false;

  return timingSafeEqual(expectedBuf, receivedBuf);
}

interface WhatsappWebhookMessage {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
}

interface WhatsappWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        messages?: WhatsappWebhookMessage[];
      };
    }>;
  }>;
}

/**
 * Receives inbound WhatsApp messages (and delivery/read status updates,
 * which are ignored — only `type: "text"` messages drive triage). Meta
 * expects a fast 200 regardless of processing outcome or it retries
 * aggressively, so this never returns an error status once the signature
 * checks out.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!isValidSignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const body = JSON.parse(rawBody) as WhatsappWebhookPayload;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      const messages = change.value?.messages ?? [];
      if (!phoneNumberId || messages.length === 0) continue;

      const tenant = await prisma.tenant.findUnique({ where: { whatsappPhoneNumberId: phoneNumberId } });
      if (!tenant) {
        console.warn(`[whatsapp] webhook recebido para phone_number_id desconhecido: ${phoneNumberId}`);
        continue;
      }

      for (const message of messages) {
        if (message.type !== "text" || !message.from || !message.text?.body) continue;

        const whatsapp = normalizeWhatsappPhone(message.from);
        if (!whatsapp) continue;

        const lead = await prisma.lead.findFirst({
          where: { tenantId: tenant.id, whatsapp },
          orderBy: { createdAt: "desc" },
        });
        if (!lead) {
          console.warn(`[whatsapp] mensagem recebida de número sem lead correspondente: ${whatsapp}`);
          continue;
        }

        const messageBody = message.text.body;

        await prisma.whatsappMessage.create({
          data: {
            tenantId: tenant.id,
            leadId: lead.id,
            direction: WhatsappDirection.IN,
            body: messageBody,
            waMessageId: message.id,
            status: "received",
          },
        });

        await prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            type: LeadEventType.WHATSAPP,
            message: `WhatsApp recebido: "${messageBody}"`,
            payload: { direction: "IN" },
          },
        });

        const isOptOut = OPT_OUT_KEYWORDS.some((kw) => messageBody.toLowerCase().includes(kw));
        if (isOptOut) {
          await prisma.lead.update({ where: { id: lead.id }, data: { whatsappOptOut: true } });
          continue;
        }

        await enqueueClassifyReply({ tenantId: tenant.id, leadId: lead.id });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
