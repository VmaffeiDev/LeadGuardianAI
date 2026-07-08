import { NextResponse } from "next/server";
import { getVendedorRanking, getTenantAvgResponseMinutes } from "@leadguardian/core";
import { requireSession, requirePermission, scopedDb, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const session = await requireSession();
    requirePermission(session, "ranking:view");
    const db = scopedDb(session);

    const [ranking, avgResponseMinutes] = await Promise.all([
      getVendedorRanking(db, session.user.tenantId),
      getTenantAvgResponseMinutes(db, session.user.tenantId),
    ]);

    return NextResponse.json({ ranking, avgResponseMinutes });
  } catch (err) {
    return handleApiError(err);
  }
}
