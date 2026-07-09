import { Emitter } from "@socket.io/redis-emitter";
import {
  REALTIME_EVENTS,
  tenantRoom,
  userRoom,
  type LeadAlertPayload,
  type TriggeredAlert,
} from "@leadguardian/core";
import { pubConnection } from "./redis";

// The worker never runs its own Socket.IO server. It publishes through the
// same Redis instance apps/web's Socket.IO server uses as its adapter, so
// @socket.io/redis-emitter can deliver events to connected browsers without
// this process holding any WebSocket connections itself.
const emitter = new Emitter(pubConnection);

export async function publishLeadAlert(alert: TriggeredAlert, leadName: string) {
  const payload: LeadAlertPayload = {
    leadId: alert.leadId,
    leadName,
    tenantId: alert.tenantId,
    level: alert.level,
    assignedToId: alert.assignedToId,
    idleMinutes: alert.idleMinutes,
  };

  // WARNING stays with the assigned vendedor; CRITICAL escalates tenant-wide so the gestor sees it too.
  if (alert.level === "WARNING" && alert.assignedToId) {
    emitter.to(userRoom(alert.assignedToId)).emit(REALTIME_EVENTS.LEAD_ALERT, payload);
  } else {
    emitter.to(tenantRoom(alert.tenantId)).emit(REALTIME_EVENTS.LEAD_ALERT, payload);
  }

  emitter
    .to(tenantRoom(alert.tenantId))
    .emit(REALTIME_EVENTS.LEAD_UPDATED, { leadId: alert.leadId, tenantId: alert.tenantId });
}
