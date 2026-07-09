"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Siren, Users } from "lucide-react";
import { useLeads } from "@/hooks/use-leads";
import { useTenantThresholds } from "@/hooks/use-tenant-thresholds";
import { useLeadAlerts } from "@/hooks/use-lead-alerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { IdleTimer } from "@/components/leads/idle-timer";
import { SummaryCard } from "./summary-card";

function minutesSince(date: string) {
  return (Date.now() - new Date(date).getTime()) / 60_000;
}

export function DashboardView() {
  const { leads } = useLeads();
  const thresholds = useTenantThresholds();
  const alerts = useLeadAlerts();

  const openLeads = useMemo(
    () => leads.filter((l) => l.status !== "GANHO" && l.status !== "PERDIDO"),
    [leads],
  );

  const warningLeads = openLeads.filter((l) => {
    const m = minutesSince(l.lastInteractionAt);
    return m >= thresholds.warningMinutes && m < thresholds.criticalMinutes;
  });

  const criticalLeads = openLeads.filter(
    (l) => minutesSince(l.lastInteractionAt) >= thresholds.criticalMinutes,
  );

  const stalledLeads = [...criticalLeads, ...warningLeads];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão em tempo real do funil de leads</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Users} label="Leads em aberto" value={openLeads.length} />
        <SummaryCard icon={Clock} label="Parados (aviso)" value={warningLeads.length} tone="warning" />
        <SummaryCard icon={Siren} label="Críticos" value={criticalLeads.length} tone="critical" />
        <SummaryCard icon={AlertTriangle} label="Alertas recentes" value={alerts.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Leads parados</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {stalledLeads.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum lead parado no momento.</p>
          )}
          {stalledLeads.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center justify-between rounded-md border border-border p-3 text-sm hover:bg-accent"
            >
              <div>
                <p className="font-medium">{lead.name}</p>
                <p className="text-xs text-muted-foreground">
                  {lead.assignedTo?.name ?? "Não atribuído"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LeadStatusBadge status={lead.status} />
                <IdleTimer
                  since={lead.lastInteractionAt}
                  warningMinutes={thresholds.warningMinutes}
                  criticalMinutes={thresholds.criticalMinutes}
                />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
