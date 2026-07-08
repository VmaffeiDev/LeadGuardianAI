import type { Server as IOServer } from "socket.io";

// Set once by server.ts at boot. Lets API routes running in the same
// process emit real-time events without threading the io instance through
// every function call.
const globalForSocket = globalThis as unknown as { io?: IOServer };

export function setIO(io: IOServer) {
  globalForSocket.io = io;
}

export function getIO(): IOServer | undefined {
  return globalForSocket.io;
}
