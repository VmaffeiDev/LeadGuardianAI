"use client";

import { useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useLeads } from "@/hooks/use-leads";
import { useTenantThresholds } from "@/hooks/use-tenant-thresholds";
import { LeadStatusBadge } from "./lead-status-badge";
import { LeadTemperatureBadge } from "./lead-temperature-badge";
import { IdleTimer } from "./idle-timer";
import { NewLeadForm } from "./new-lead-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Role } from "@leadguardian/db";

const CAN_CREATE: Role[] = ["ADMIN", "TRATADOR"];
const CAN_REASSIGN: Role[] = ["ADMIN", "GESTOR"];

export function LeadsView({ role }: { role: Role }) {
  const { leads, loading, refetch } = useLeads();
  const thresholds = useTenantThresholds();
  const canCreate = CAN_CREATE.includes(role);
  const canReassign = CAN_REASSIGN.includes(role);

  // Quente leads surface first — the round-robin order among vendedores is
  // untouched, this only affects what the gestor/vendedor sees at the top.
  const sortedLeads = useMemo(
    () => [...leads].sort((a, b) => (a.temperature === "QUENTE" ? 0 : 1) - (b.temperature === "QUENTE" ? 0 : 1)),
    [leads],
  );

  async function handleDistribute(leadId: string) {
    const res = await fetch(`/api/leads/${leadId}/distribuir`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Erro ao distribuir lead");
      return;
    }
    const data = await res.json();
    toast.success(data.vendedor ? `Distribuído para ${data.vendedor.name}` : "Lead distribuído");
    refetch();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Leads</h1>
        <p className="text-sm text-muted-foreground">
          {role === "VENDEDOR" ? "Seus leads em andamento" : "Todos os leads do funil"}
        </p>
      </div>

      {canCreate && (
        <div className="flex flex-wrap items-start gap-2">
          <NewLeadForm onCreated={refetch} />
          <Link href="/leads/importar">
            <Button variant="outline">Importar CSV</Button>
          </Link>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Temperatura</TableHead>
                <TableHead>Sem resposta há</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                      {lead.name}
                    </Link>
                    {lead.phone && <p className="text-xs text-muted-foreground">{lead.phone}</p>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.source ?? "-"}</TableCell>
                  <TableCell className="text-sm">{lead.assignedTo?.name ?? "Não atribuído"}</TableCell>
                  <TableCell>
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell>
                    <LeadTemperatureBadge temperature={lead.temperature} />
                  </TableCell>
                  <TableCell>
                    <IdleTimer
                      since={lead.lastInteractionAt}
                      warningMinutes={thresholds.warningMinutes}
                      criticalMinutes={thresholds.criticalMinutes}
                    />
                  </TableCell>
                  <TableCell>
                    {canReassign && lead.status === "EM_TRIAGEM" && (
                      <Button size="sm" variant="outline" onClick={() => handleDistribute(lead.id)}>
                        Distribuir mesmo assim
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && leads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhum lead encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
