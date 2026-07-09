"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LeadStatusBadge } from "./lead-status-badge";
import { IdleTimer } from "./idle-timer";
import { useSocketEvent } from "@/hooks/use-socket";
import { useTenantThresholds } from "@/hooks/use-tenant-thresholds";
import { REALTIME_EVENTS, type LeadUpdatedPayload } from "@leadguardian/core/realtime";
import type { LeadStatus } from "@leadguardian/db";

interface LeadEvent {
  id: string;
  type: string;
  message: string | null;
  createdAt: string;
  author: { name: string } | null;
}

interface LeadDetail {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: LeadStatus;
  lastInteractionAt: string;
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  events: LeadEvent[];
}

// UI affordance only — which status buttons to offer. The state machine is
// enforced authoritatively server-side in @leadguardian/core (changeLeadStatus).
const NEXT_STATUS: Record<LeadStatus, LeadStatus[]> = {
  NOVO: ["EM_ATENDIMENTO", "PERDIDO"],
  EM_ATENDIMENTO: ["EM_NEGOCIACAO", "PERDIDO"],
  EM_NEGOCIACAO: ["GANHO", "PERDIDO", "EM_ATENDIMENTO"],
  GANHO: [],
  PERDIDO: [],
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  NOVO: "Novo",
  EM_ATENDIMENTO: "Em atendimento",
  EM_NEGOCIACAO: "Em negociação",
  GANHO: "Ganho",
  PERDIDO: "Perdido",
};

const EVENT_LABEL: Record<string, string> = {
  STATUS_CHANGE: "Status",
  NOTE: "Nota",
  ASSIGNMENT: "Atribuição",
  ALERT: "Alerta",
  CONTACT: "Contato",
};

export function LeadDetailView({ leadId }: { leadId: string }) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const thresholds = useTenantThresholds();

  async function refetch() {
    const res = await fetch(`/api/leads/${leadId}`);
    if (res.ok) {
      const data = await res.json();
      setLead(data.lead);
    }
    setLoading(false);
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  useSocketEvent<LeadUpdatedPayload>(REALTIME_EVENTS.LEAD_UPDATED, (payload) => {
    if (payload.leadId === leadId) refetch();
  });

  async function handleStatusChange(status: LeadStatus) {
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Erro ao atualizar status");
      return;
    }
    toast.success(`Status atualizado para ${STATUS_LABEL[status]}`);
    refetch();
  }

  async function handleContact(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "CONTACT", message }),
      });
      if (!res.ok) throw new Error("Erro ao registrar contato");
      setMessage("");
      toast.success("Interação registrada, cronômetro reiniciado");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar contato");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!lead) return <p className="text-sm text-muted-foreground">Lead não encontrado.</p>;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/leads"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para leads
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{lead.name}</h1>
          <p className="text-sm text-muted-foreground">
            {lead.phone ?? "sem telefone"} · {lead.source ?? "origem não informada"}
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
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {lead.events.map((event) => (
              <div key={event.id} className="border-l-2 border-border pl-3 text-sm">
                <p className="font-medium">
                  {EVENT_LABEL[event.type] ?? event.type}
                  {event.author && (
                    <span className="font-normal text-muted-foreground"> · {event.author.name}</span>
                  )}
                </p>
                {event.message && <p className="text-muted-foreground">{event.message}</p>}
                <p className="text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Atualizar status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {NEXT_STATUS[lead.status].length === 0 && (
                <p className="text-sm text-muted-foreground">Lead encerrado.</p>
              )}
              {NEXT_STATUS[lead.status].map((status) => (
                <Button key={status} size="sm" variant="outline" onClick={() => handleStatusChange(status)}>
                  {STATUS_LABEL[status]}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Registrar contato</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContact} className="flex flex-col gap-2">
                <Label htmlFor="message">O que foi conversado?</Label>
                <Input
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Liguei, aguardando retorno..."
                />
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Salvando..." : "Registrar e reiniciar cronômetro"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p>
                <span className="text-muted-foreground">Vendedor:</span>{" "}
                {lead.assignedTo?.name ?? "Não atribuído"}
              </p>
              <p>
                <span className="text-muted-foreground">Cadastrado por:</span>{" "}
                {lead.createdBy?.name ?? "-"}
              </p>
              {lead.email && (
                <p>
                  <span className="text-muted-foreground">E-mail:</span> {lead.email}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
