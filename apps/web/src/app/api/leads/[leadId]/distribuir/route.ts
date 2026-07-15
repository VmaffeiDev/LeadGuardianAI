import { NextRequest, NextResponse } from "next/server";
import { assignNextVendedor, changeLeadStatus, REALTIME_EVENTS, tenantRoom } from "@leadguardian/core";
import { LeadStatus, prisma } from "@leadguardian/db";
import { requireSession, requirePermission, scopedDb, handleApiError, ApiError } from "@/lib/api";
import { getIO } from "@/lib/socket";

/** Manual override for a lead the WhatsApp triage classified FRIO (or that's still awaiting a reply) — the gestor decides to distribute it anyway. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params;
    const session = await requireSession();
    requirePermission(session, "lead:reassign");

    const db = scopedDb(session);
    const lead = await db.lead.findFirst({ where: { id: leadId } });
    if (!lead) throw new ApiError(404, "Lead não encontrado");
    if (lead.status !== LeadStatus.EM_TRIAGEM) {
      throw new ApiError(400, "Este lead já foi distribuído");
    }

    await changeLeadStatus(db, {
      tenantId: session.user.tenantId,
      leadId,
      to: LeadStatus.NOVO,
      authorId: session.user.id,
      note: "Distribuído manualmente pelo gestor",
    });

    // Distribution needs a tenant-wide row lock, independent from this
    // request's scoped client, so it takes the base client + explicit tenantId.
    const vendedor = await assignNextVendedor(prisma, session.user.tenantId, leadId);

    getIO()
      ?.to(tenantRoom(session.user.tenantId))
      .emit(REALTIME_EVENTS.LEAD_UPDATED, { leadId, tenantId: session.user.tenantId });

    return NextResponse.json({ vendedor: vendedor ? { id: vendedor.id, name: vendedor.name } : null });
  } catch (err) {
    return handleApiError(err);
  }
}
