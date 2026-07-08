import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Base client, not tenant-scoped. Used by the seed script, the worker (which
// always sets tenantId explicitly per record) and as the base for
// `withTenant()` in @leadguardian/core/tenancy.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
export { PrismaClient };
