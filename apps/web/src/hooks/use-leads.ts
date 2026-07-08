"use client";

import { useCallback, useEffect, useState } from "react";
import { REALTIME_EVENTS, type LeadUpdatedPayload } from "@leadguardian/core/realtime";
import type { LeadStatus } from "@leadguardian/db";
import { useSocketEvent } from "./use-socket";

export interface LeadListItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: LeadStatus;
  lastInteractionAt: string;
  assignedTo: { id: string; name: string } | null;
}

export function useLeads() {
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/leads");
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useSocketEvent<LeadUpdatedPayload>(REALTIME_EVENTS.LEAD_UPDATED, () => {
    refetch();
  });

  return { leads, loading, refetch };
}
