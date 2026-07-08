import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { getToken } from "next-auth/jwt";
import { tenantRoom, userRoom } from "@leadguardian/core";
import { setIO } from "./src/lib/socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// NextAuth prefixes the session cookie with "__Secure-" only when served
// over https. Default assumption for a fresh Docker Compose deploy is plain
// HTTP behind the caller's own reverse proxy — set AUTH_URL to an https://
// origin once TLS is terminated in front of this app.
const secureCookies = (process.env.AUTH_URL ?? "").startsWith("https://");
const sessionCookieName = secureCookies ? "__Secure-authjs.session-token" : "authjs.session-token";

async function main() {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/socket.io",
  });

  const pubClient = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  const subClient = pubClient.duplicate();
  for (const client of [pubClient, subClient]) {
    client.on("error", (err) => console.error("[redis] connection error:", err.message));
  }
  io.adapter(createAdapter(pubClient, subClient));

  // Authenticate each socket connection off the same session cookie the
  // Next.js app uses, so a browser tab only ever joins its own tenant/user
  // rooms — no separate token issuance flow needed.
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? "";
      const token = await getToken({
        req: { headers: { cookie: cookieHeader } } as never,
        secret: process.env.AUTH_SECRET,
        salt: sessionCookieName,
      });

      if (!token?.tenantId || !token?.id) {
        next(new Error("unauthorized"));
        return;
      }

      socket.data.tenantId = token.tenantId as string;
      socket.data.userId = token.id as string;
      next();
    } catch (err) {
      next(err instanceof Error ? err : new Error("socket auth failed"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(tenantRoom(socket.data.tenantId));
    socket.join(userRoom(socket.data.userId));
  });

  setIO(io);

  httpServer.listen(port, () => {
    console.log(`> LeadGuardianAI ouvindo em http://${hostname}:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
