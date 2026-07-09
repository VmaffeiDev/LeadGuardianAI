import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { prisma } from "@leadguardian/db";
import { withTenant, can, type Action } from "@leadguardian/core";
import { auth } from "./auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Loads the current session or throws a 401 ApiError. Use inside route handlers. */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) throw new ApiError(401, "Não autenticado");
  return session;
}

/** Throws a 403 ApiError if the session's role can't perform `action`. */
export function requirePermission(session: Session, action: Action) {
  if (!can(session.user.role, action)) {
    throw new ApiError(403, "Sem permissão para esta ação");
  }
}

/** Prisma client pre-scoped to the session's tenant — every query is auto-filtered by tenantId. */
export function scopedDb(session: Session) {
  return withTenant(prisma, session.user.tenantId);
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}
