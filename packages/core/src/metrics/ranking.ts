import { LeadEventType, LeadStatus, type PrismaClient } from "@leadguardian/db";

export interface VendedorRanking {
  vendedorId: string;
  name: string;
  totalLeads: number;
  ganhos: number;
  perdidos: number;
  conversionRate: number;
  avgFirstResponseMinutes: number | null;
}

/**
 * Ranking used by the dashboard and the /ranking page. First-response time
 * is measured from `assignedAt` to the first CONTACT event on each lead —
 * this is the metric the product is meant to shrink.
 */
export async function getVendedorRanking(
  prisma: PrismaClient,
  tenantId: string,
): Promise<VendedorRanking[]> {
  const vendedores = await prisma.user.findMany({
    where: { tenantId, role: "VENDEDOR" },
    include: {
      assignedLeads: {
        select: {
          status: true,
          assignedAt: true,
          events: {
            where: { type: LeadEventType.CONTACT },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      },
    },
  });

  const ranking = vendedores.map((v) => {
    const totalLeads = v.assignedLeads.length;
    const ganhos = v.assignedLeads.filter((l) => l.status === LeadStatus.GANHO).length;
    const perdidos = v.assignedLeads.filter((l) => l.status === LeadStatus.PERDIDO).length;
    const closed = ganhos + perdidos;

    const firstResponseMinutes = v.assignedLeads
      .map((l) => {
        const firstContact = l.events[0];
        if (!firstContact || !l.assignedAt) return null;
        const minutes = (firstContact.createdAt.getTime() - l.assignedAt.getTime()) / 60_000;
        return minutes >= 0 ? minutes : null;
      })
      .filter((n): n is number => n !== null);

    const avgFirstResponseMinutes = firstResponseMinutes.length
      ? firstResponseMinutes.reduce((a, b) => a + b, 0) / firstResponseMinutes.length
      : null;

    return {
      vendedorId: v.id,
      name: v.name,
      totalLeads,
      ganhos,
      perdidos,
      conversionRate: closed > 0 ? ganhos / closed : 0,
      avgFirstResponseMinutes,
    };
  });

  return ranking.sort((a, b) => b.ganhos - a.ganhos || b.conversionRate - a.conversionRate);
}

export async function getTenantAvgResponseMinutes(
  prisma: PrismaClient,
  tenantId: string,
): Promise<number | null> {
  const ranking = await getVendedorRanking(prisma, tenantId);
  const values = ranking
    .map((r) => r.avgFirstResponseMinutes)
    .filter((v): v is number => v !== null);
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
