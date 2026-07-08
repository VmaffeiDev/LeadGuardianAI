import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requirePermission, scopedDb, handleApiError, ApiError } from "@/lib/api";

const thresholdsSchema = z.object({
  warningMinutes: z.number().int().min(1),
  criticalMinutes: z.number().int().min(1),
});

export async function GET() {
  try {
    const session = await requireSession();
    const db = scopedDb(session);
    const tenant = await db.tenant.findFirstOrThrow({ where: { id: session.user.tenantId } });
    return NextResponse.json({ tenant });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session, "settings:manage");
    const db = scopedDb(session);

    const body = await req.json();
    const parsed = thresholdsSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "Limites inválidos");
    if (parsed.data.warningMinutes >= parsed.data.criticalMinutes) {
      throw new ApiError(400, "O limite crítico deve ser maior que o de aviso");
    }

    const tenant = await db.tenant.update({
      where: { id: session.user.tenantId },
      data: { alertThresholds: parsed.data },
    });

    return NextResponse.json({ tenant });
  } catch (err) {
    return handleApiError(err);
  }
}
