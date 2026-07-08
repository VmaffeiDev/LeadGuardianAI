import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@leadguardian/db";
import { assignNextVendedor, REALTIME_EVENTS, tenantRoom } from "@leadguardian/core";
import { requireSession, requirePermission, scopedDb, handleApiError, ApiError } from "@/lib/api";
import { getIO } from "@/lib/socket";

const createLeadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  source: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const db = scopedDb(session);

    // Vendedores only see their own leads; every other role sees the full tenant funnel.
    const where = session.user.role === "VENDEDOR" ? { assignedToId: session.user.id } : {};

    const leads = await db.lead.findMany({
      where,
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { lastInteractionAt: "asc" },
    });

    return NextResponse.json({ leads });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session, "lead:create");

    const body = await req.json();
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "Dados de lead inválidos");

    const db = scopedDb(session);
    const lead = await db.lead.create({
      data: {
        // tenantId is also auto-injected by the tenant-scope extension; passed
        // explicitly here too so this satisfies Prisma's required-field types.
        tenantId: session.user.tenantId,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || undefined,
        source: parsed.data.source,
        createdById: session.user.id,
      },
    });

    await db.leadEvent.create({
      data: {
        leadId: lead.id,
        authorId: session.user.id,
        type: "STATUS_CHANGE",
        message: "Lead cadastrado",
        payload: { to: "NOVO" },
      },
    });

    // Distribution needs a tenant-wide row lock, independent from this
    // request's scoped client, so it takes the base client + explicit tenantId.
    const vendedor = await assignNextVendedor(prisma, session.user.tenantId, lead.id);

    getIO()
      ?.to(tenantRoom(session.user.tenantId))
      .emit(REALTIME_EVENTS.LEAD_UPDATED, { leadId: lead.id, tenantId: session.user.tenantId });

    // Never echo the full User row back — it carries passwordHash.
    const assignedTo = vendedor ? { id: vendedor.id, name: vendedor.name } : null;

    return NextResponse.json({ lead, assignedTo }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
