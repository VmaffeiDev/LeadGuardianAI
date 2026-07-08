import type { PrismaClient } from "@leadguardian/db";

/**
 * Prisma models that carry a `tenantId` column and must never be read or
 * written across tenant boundaries. LeadEvent is intentionally excluded: it
 * has no tenantId column of its own and is always reached through its Lead
 * relation, which is itself tenant-scoped.
 */
const TENANT_SCOPED_MODELS = new Set(["User", "Lead", "Alert", "DistributionState"]);

const READ_AND_SINGLE_WRITE_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
  "update",
  "delete",
]);

/**
 * Returns a Prisma client scoped to a single tenant: every query against a
 * tenant-owned model gets `tenantId` merged into its `where`, and every
 * create gets `tenantId` merged into its `data`. This is the single place
 * that enforces multi-tenant isolation, so call sites in apps/web and
 * apps/worker never need to remember to filter by tenantId themselves.
 *
 * `tenantId` must come from a verified source (session, JWT) — never from
 * unauthenticated user input.
 */
export function withTenant(prisma: PrismaClient, tenantId: string): PrismaClient {
  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const scopedArgs = args as { where?: object; data?: object | object[]; create?: object };

          if (READ_AND_SINGLE_WRITE_OPS.has(operation)) {
            scopedArgs.where = { ...(scopedArgs.where ?? {}), tenantId };
          }

          if (operation === "create") {
            scopedArgs.data = { ...(scopedArgs.data as object), tenantId };
          }

          if (operation === "createMany" || operation === "createManyAndReturn") {
            scopedArgs.data = Array.isArray(scopedArgs.data)
              ? scopedArgs.data.map((row) => ({ ...row, tenantId }))
              : scopedArgs.data;
          }

          if (operation === "upsert") {
            scopedArgs.where = { ...(scopedArgs.where ?? {}), tenantId };
            scopedArgs.create = { ...(scopedArgs.create as object), tenantId };
          }

          return query(scopedArgs);
        },
      },
    },
  }) as PrismaClient;
}
