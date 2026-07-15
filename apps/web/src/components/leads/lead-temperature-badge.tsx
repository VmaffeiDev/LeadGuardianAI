import { Badge } from "@/components/ui/badge";
import type { LeadTemperature } from "@leadguardian/db";

const TEMPERATURE_CONFIG: Record<
  LeadTemperature,
  { label: string; variant: "destructive" | "warning" | "secondary" }
> = {
  QUENTE: { label: "🔥 Quente", variant: "destructive" },
  MORNO: { label: "🟡 Morno", variant: "warning" },
  FRIO: { label: "❄️ Frio", variant: "secondary" },
};

export function LeadTemperatureBadge({ temperature }: { temperature: LeadTemperature | null }) {
  if (!temperature) return null;
  const config = TEMPERATURE_CONFIG[temperature];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
