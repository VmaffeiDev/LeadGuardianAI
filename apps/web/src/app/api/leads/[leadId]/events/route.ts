import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addLeadNote,
  canViewLead,
  registerLeadContact,
  REALTIME_EVENTS,
  tenantRoom,
} from "@leadguardian/core";
import { requireSession, scopedDb, handleApiError, ApiError } from "@/lib/api";
import { getIO } from "@/lib/socket";

const bodySchema = z.object({
  type: z.enum(["NOTE", "CONTACT"]),
  message: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params;
    const session = await requireSession();
    const db = scopedDb(session);

    const lead = await db.lead.findFirst({ where: { id: leadId } });
    if (!lead) throw new ApiError(404, "Lead não encontrado");
    if (!canViewLead(session.user.role, session.user.id, lead)) {
      throw new ApiError(403, "Sem permissão para este lead");
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "Payload inválido");

    const event =
      parsed.data.type === "CONTACT"
        ? await registerLeadContact(db, {
            tenantId: session.user.tenantId,
            leadId,
            authorId: session.user.id,
            message: parsed.data.message,
          })
        : await addLeadNote(db, { leadId, authorId: session.user.id, message: parsed.data.message });

    getIO()
      ?.to(tenantRoom(session.user.tenantId))
      .emit(REALTIME_EVENTS.LEAD_UPDATED, { leadId, tenantId: session.user.tenantId });

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
