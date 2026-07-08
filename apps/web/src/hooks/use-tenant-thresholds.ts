"use client";

import { useEffect, useState } from "react";

export interface AlertThresholds {
  warningMinutes: number;
  criticalMinutes: number;
}

const DEFAULT_THRESHOLDS: AlertThresholds = { warningMinutes: 15, criticalMinutes: 30 };

export function useTenantThresholds(): AlertThresholds {
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);

  useEffect(() => {
    fetch("/api/tenant").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      const raw = data.tenant?.alertThresholds;
      if (typeof raw?.warningMinutes === "number" && typeof raw?.criticalMinutes === "number") {
        setThresholds(raw);
      }
    });
  }, []);

  return thresholds;
}
