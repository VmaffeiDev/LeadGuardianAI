import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@leadguardian/db";

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }
> = {
  NOVO: { label: "Novo", variant: "secondary" },
  EM_ATENDIMENTO: { label: "Em atendimento", variant: "default" },
  EM_NEGOCIACAO: { label: "Em negociação", variant: "warning" },
  GANHO: { label: "Ganho", variant: "success" },
  PERDIDO: { label: "Perdido", variant: "destructive" },
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
