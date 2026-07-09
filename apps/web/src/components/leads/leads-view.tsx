"use client";

import Link from "next/link";
import { useLeads } from "@/hooks/use-leads";
import { useTenantThresholds } from "@/hooks/use-tenant-thresholds";
import { LeadStatusBadge } from "./lead-status-badge";
import { IdleTimer } from "./idle-timer";
import { NewLeadForm } from "./new-lead-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import type { Role } from "@leadguardian/db";

const CAN_CREATE: Role[] = ["ADMIN", "TRATADOR"];

export function LeadsView({ role }: { role: Role }) {
  const { leads, loading, refetch } = useLeads();
  const thresholds = useTenantThresholds();
  const canCreate = CAN_CREATE.includes(role);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Leads</h1>
        <p className="text-sm text-muted-foreground">
          {role === "VENDEDOR" ? "Seus leads em andamento" : "Todos os leads do funil"}
        </p>
      </div>

      {canCreate && <NewLeadForm onCreated={refetch} />}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sem resposta há</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
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
                    <IdleTimer
                      since={lead.lastInteractionAt}
                      warningMinutes={thresholds.warningMinutes}
                      criticalMinutes={thresholds.criticalMinutes}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {!loading && leads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
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
