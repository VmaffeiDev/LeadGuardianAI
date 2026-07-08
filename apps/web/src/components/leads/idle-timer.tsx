"use client";

import { useElapsedMinutes } from "@/hooks/use-countdown";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function formatMinutes(minutes: number): string {
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${Math.floor(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.floor(minutes % 60);
  return `${hours}h ${rest}min`;
}

export function IdleTimer({
  since,
  warningMinutes = 15,
  criticalMinutes = 30,
}: {
  since: string;
  warningMinutes?: number;
  criticalMinutes?: number;
}) {
  const minutes = useElapsedMinutes(since);
  const level = minutes >= criticalMinutes ? "critical" : minutes >= warningMinutes ? "warning" : "ok";

  return (
    <Badge
      variant={level === "critical" ? "destructive" : level === "warning" ? "warning" : "secondary"}
      className={cn(level === "critical" && "animate-pulse")}
    >
      {formatMinutes(minutes)}
    </Badge>
  );
}
