"use client";

import { useState } from "react";
import { toast } from "sonner";
import { REALTIME_EVENTS, type LeadAlertPayload } from "@leadguardian/core/realtime";
import { useSocketEvent } from "./use-socket";

export function useLeadAlerts(maxItems = 20) {
  const [alerts, setAlerts] = useState<LeadAlertPayload[]>([]);

  useSocketEvent<LeadAlertPayload>(REALTIME_EVENTS.LEAD_ALERT, (payload) => {
    setAlerts((prev) => [payload, ...prev].slice(0, maxItems));
    const notify = payload.level === "CRITICAL" ? toast.error : toast.warning;
    notify(`${payload.leadName}: sem resposta há ${Math.round(payload.idleMinutes)} min`);
  });

  return alerts;
}
