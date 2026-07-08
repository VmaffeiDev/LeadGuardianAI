import type { AlertLevel } from "@leadguardian/db";

/**
 * Shared between apps/web (Socket.IO server, via @socket.io/redis-adapter)
 * and apps/worker (emits via @socket.io/redis-emitter, no full Socket.IO
 * server needed there) so both sides agree on event names, room naming and
 * payload shapes without importing socket.io itself.
 */
export const REALTIME_EVENTS = {
  LEAD_ALERT: "lead:alert",
  LEAD_UPDATED: "lead:updated",
} as const;

export interface LeadAlertPayload {
  leadId: string;
  leadName: string;
  tenantId: string;
  level: AlertLevel;
  assignedToId: string | null;
  idleMinutes: number;
}

export interface LeadUpdatedPayload {
  leadId: string;
  tenantId: string;
}

export function tenantRoom(tenantId: string): string {
  return `tenant:${tenantId}`;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}
