import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LeadStatus } from "@leadguardian/db";
import { canViewLead, changeLeadStatus, REALTIME_EVENTS, tenantRoom } from "@leadguardian/core";
import { requireSession, requirePermission, scopedDb, handleApiError, ApiError } from "@/lib/api";
import { getIO } from "@/lib/socket";

const patchSchema = z.union([
  z.object({ status: z.nativeEnum(LeadStatus), note: z.string().optional() }),
  z.object({ assignedToId: z.string() }),
]);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params;
    const session = await requireSession();
    const db = scopedDb(session);

    const lead = await db.lead.findFirst({
      where: { id: leadId },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        events: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      },
    });

    if (!lead) throw new ApiError(404, "Lead não encontrado");
    if (!canViewLead(session.user.role, session.user.id, lead)) {
      throw new ApiError(403, "Sem permissão para ver este lead");
    }

    return NextResponse.json({ lead });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params;
    const session = await requireSession();
    const db = scopedDb(session);

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "Payload inválido");

    const lead = await db.lead.findFirst({ where: { id: leadId } });
    if (!lead) throw new ApiError(404, "Lead não encontrado");

    if ("status" in parsed.data) {
      if (!canViewLead(session.user.role, session.user.id, lead)) {
        throw new ApiError(403, "Sem permissão para atualizar este lead");
      }
      requirePermission(session, "lead:updateStatus");

      const updated = await changeLeadStatus(db, {
        tenantId: session.user.tenantId,
        leadId,
        to: parsed.data.status,
        authorId: session.user.id,
        note: parsed.data.note,
      });

      getIO()
        ?.to(tenantRoom(session.user.tenantId))
        .emit(REALTIME_EVENTS.LEAD_UPDATED, { leadId, tenantId: session.user.tenantId });

      return NextResponse.json({ lead: updated });
    }

    requirePermission(session, "lead:reassign");

    const updated = await db.lead.update({
      where: { id: leadId },
      data: {
        assignedToId: parsed.data.assignedToId,
        assignedAt: new Date(),
        lastInteractionAt: new Date(),
      },
    });

    await db.leadEvent.create({
      data: {
        leadId,
        authorId: session.user.id,
        type: "ASSIGNMENT",
        message: "Reatribuído manualmente pelo gestor",
        payload: { assignedToId: parsed.data.assignedToId },
      },
    });

    getIO()
      ?.to(tenantRoom(session.user.tenantId))
      .emit(REALTIME_EVENTS.LEAD_UPDATED, { leadId, tenantId: session.user.tenantId });

    return NextResponse.json({ lead: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
