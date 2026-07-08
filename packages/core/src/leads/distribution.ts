import { LeadEventType, type PrismaClient, type User } from "@leadguardian/db";

/**
 * Assigns a lead to the next vendedor in the tenant's round-robin queue
 * ("vendedor da vez"). Runs inside a transaction that locks the tenant's
 * DistributionState row with `SELECT ... FOR UPDATE`, so two leads created
 * at the same instant can never be handed to the same vendedor.
 *
 * Only vendedores with `active: true` and `inRotation: true` participate.
 * Returns `null` if the tenant has no vendedor available to receive leads.
 */
export async function assignNextVendedor(
  prisma: PrismaClient,
  tenantId: string,
  leadId: string,
): Promise<User | null> {
  return prisma.$transaction(async (tx) => {
    // Make sure the row we're about to lock exists (first lead ever for this
    // tenant). Postgres upsert is atomic (INSERT ... ON CONFLICT), so this is
    // race-safe even if two requests hit it simultaneously.
    await tx.distributionState.upsert({
      where: { tenantId },
      update: {},
      create: { tenantId },
    });

    // Serialize concurrent distributions for this tenant: the second
    // transaction blocks here until the first commits or rolls back.
    await tx.$executeRaw`SELECT id FROM "distribution_states" WHERE "tenantId" = ${tenantId} FOR UPDATE`;

    const state = await tx.distributionState.findUnique({ where: { tenantId } });

    const vendedores = await tx.user.findMany({
      where: { tenantId, role: "VENDEDOR", active: true, inRotation: true },
      orderBy: { rotationOrder: "asc" },
    });

    if (vendedores.length === 0) {
      return null;
    }

    const lastIndex = state?.lastAssignedUserId
      ? vendedores.findIndex((v) => v.id === state.lastAssignedUserId)
      : -1;
    const nextVendedor = vendedores[(lastIndex + 1) % vendedores.length]!;

    const now = new Date();

    await tx.lead.update({
      where: { id: leadId, tenantId },
      data: { assignedToId: nextVendedor.id, assignedAt: now, lastInteractionAt: now },
    });

    await tx.distributionState.update({
      where: { tenantId },
      data: { lastAssignedUserId: nextVendedor.id },
    });

    await tx.leadEvent.create({
      data: {
        leadId,
        type: LeadEventType.ASSIGNMENT,
        message: `Distribuído automaticamente para ${nextVendedor.name}`,
        payload: { assignedToId: nextVendedor.id },
      },
    });

    return nextVendedor;
  });
}
