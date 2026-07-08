import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, requirePermission, scopedDb, handleApiError, ApiError } from "@/lib/api";

const patchSchema = z.object({
  active: z.boolean().optional(),
  inRotation: z.boolean().optional(),
  rotationOrder: z.number().int().min(0).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();
    requirePermission(session, "vendedor:manage");
    const db = scopedDb(session);

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "Dados inválidos");
    if (Object.keys(parsed.data).length === 0) throw new ApiError(400, "Nada para atualizar");

    const vendedor = await db.user.update({
      where: { id, role: "VENDEDOR" },
      data: parsed.data,
      // Never return passwordHash to the client.
      select: { id: true, name: true, email: true, active: true, inRotation: true, rotationOrder: true },
    });

    return NextResponse.json({ vendedor });
  } catch (err) {
    return handleApiError(err);
  }
}
