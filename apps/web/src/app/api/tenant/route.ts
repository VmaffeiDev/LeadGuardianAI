import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@leadguardian/db";
import { requireSession, requirePermission, scopedDb, handleApiError, ApiError } from "@/lib/api";

const patchSchema = z.object({
  warningMinutes: z.number().int().min(1).optional(),
  criticalMinutes: z.number().int().min(1).optional(),
  whatsappPhoneNumberId: z.string().trim().min(1).optional(),
  whatsappTemplateName: z.string().trim().min(1).optional(),
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
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "Dados inválidos");

    const data: Prisma.TenantUpdateInput = {};

    if (parsed.data.warningMinutes !== undefined || parsed.data.criticalMinutes !== undefined) {
      const current = await db.tenant.findFirstOrThrow({ where: { id: session.user.tenantId } });
      const currentThresholds = current.alertThresholds as { warningMinutes: number; criticalMinutes: number };
      const warningMinutes = parsed.data.warningMinutes ?? currentThresholds.warningMinutes;
      const criticalMinutes = parsed.data.criticalMinutes ?? currentThresholds.criticalMinutes;

      if (warningMinutes >= criticalMinutes) {
        throw new ApiError(400, "O limite crítico deve ser maior que o de aviso");
      }
      data.alertThresholds = { warningMinutes, criticalMinutes };
    }

    if (parsed.data.whatsappPhoneNumberId !== undefined) {
      data.whatsappPhoneNumberId = parsed.data.whatsappPhoneNumberId;
    }
    if (parsed.data.whatsappTemplateName !== undefined) {
      data.whatsappTemplateName = parsed.data.whatsappTemplateName;
    }

    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "Nada para atualizar");
    }

    const tenant = await db.tenant.update({
      where: { id: session.user.tenantId },
      data,
    });

    return NextResponse.json({ tenant });
  } catch (err) {
    return handleApiError(err);
  }
}
