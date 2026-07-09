import { AlertLevel, LeadEventType, LeadStatus, type PrismaClient } from "@leadguardian/db";

export interface AlertThresholds {
  warningMinutes: number;
  criticalMinutes: number;
}

const DEFAULT_THRESHOLDS: AlertThresholds = { warningMinutes: 15, criticalMinutes: 30 };

export function parseThresholds(raw: unknown): AlertThresholds {
  if (raw && typeof raw === "object") {
    const { warningMinutes, criticalMinutes } = raw as Partial<AlertThresholds>;
    if (typeof warningMinutes === "number" && typeof criticalMinutes === "number") {
      return { warningMinutes, criticalMinutes };
    }
  }
  return DEFAULT_THRESHOLDS;
}

export interface TriggeredAlert {
  leadId: string;
  tenantId: string;
  level: typeof AlertLevel.WARNING | typeof AlertLevel.CRITICAL;
  assignedToId: string | null;
  idleMinutes: number;
}

const OPEN_STATUSES = [LeadStatus.NOVO, LeadStatus.EM_ATENDIMENTO, LeadStatus.EM_NEGOCIACAO];

/**
 * Scans every tenant for leads idle past the warning/critical thresholds and
 * creates Alert rows for any newly crossed threshold, also auto-resolving
 * alerts for leads that received a fresh interaction. Meant to run from the
 * worker's repeatable job every 30-60s.
 *
 * Idempotent per level: a lead with an unresolved alert at a given level
 * won't get a duplicate. Uses the base (non-tenant-scoped) client since it
 * intentionally spans every tenant, filtering tenantId explicitly per query.
 */
export async function evaluateIdleLeads(prisma: PrismaClient): Promise<TriggeredAlert[]> {
  const tenants = await prisma.tenant.findMany({ select: { id: true, alertThresholds: true } });
  const triggered: TriggeredAlert[] = [];

  for (const tenant of tenants) {
    const thresholds = parseThresholds(tenant.alertThresholds);
    const now = Date.now();

    const leads = await prisma.lead.findMany({
      where: { tenantId: tenant.id, status: { in: OPEN_STATUSES }, assignedToId: { not: null } },
      include: { alerts: { where: { resolvedAt: null } } },
    });

    for (const lead of leads) {
      const idleMinutes = (now - lead.lastInteractionAt.getTime()) / 60_000;
      const level =
        idleMinutes >= thresholds.criticalMinutes
          ? AlertLevel.CRITICAL
          : idleMinutes >= thresholds.warningMinutes
            ? AlertLevel.WARNING
            : null;

      if (!level) continue;
      if (lead.alerts.some((a) => a.level === level)) continue;

      const alert = await prisma.alert.create({
        data: {
          tenantId: tenant.id,
          leadId: lead.id,
          level,
          // A CRITICAL alert always escalates to the gestor; WARNING stays with the vendedor.
          escalatedToGestor: level === AlertLevel.CRITICAL,
        },
      });

      await prisma.leadEvent.create({
        data: {
          leadId: lead.id,
          type: LeadEventType.ALERT,
          message:
            level === AlertLevel.CRITICAL
              ? `Lead crítico: sem resposta há ${Math.round(idleMinutes)} min`
              : `Lead parado: sem resposta há ${Math.round(idleMinutes)} min`,
          payload: { level, idleMinutes: Math.round(idleMinutes), alertId: alert.id },
        },
      });

      triggered.push({
        leadId: lead.id,
        tenantId: tenant.id,
        level,
        assignedToId: lead.assignedToId,
        idleMinutes,
      });
    }

    await prisma.alert.updateMany({
      where: {
        tenantId: tenant.id,
        resolvedAt: null,
        lead: { lastInteractionAt: { gt: new Date(now - thresholds.warningMinutes * 60_000) } },
      },
      data: { resolvedAt: new Date() },
    });
  }

  return triggered;
}
