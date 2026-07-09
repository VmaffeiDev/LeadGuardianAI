import { Role } from "@leadguardian/db";

export type Action =
  | "lead:create"
  | "lead:viewAll"
  | "lead:updateStatus"
  | "lead:reassign"
  | "vendedor:manage"
  | "dashboard:view"
  | "ranking:view"
  | "settings:manage";

const PERMISSIONS: Record<Role, Action[]> = {
  [Role.ADMIN]: [
    "lead:create",
    "lead:viewAll",
    "lead:updateStatus",
    "lead:reassign",
    "vendedor:manage",
    "dashboard:view",
    "ranking:view",
    "settings:manage",
  ],
  [Role.GESTOR]: [
    "lead:viewAll",
    "lead:updateStatus",
    "lead:reassign",
    "vendedor:manage",
    "dashboard:view",
    "ranking:view",
  ],
  [Role.TRATADOR]: ["lead:create", "lead:viewAll"],
  [Role.VENDEDOR]: ["lead:updateStatus"],
};

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[role]?.includes(action) ?? false;
}

/** Vendedores only see their own leads; every other role with `lead:viewAll` sees everything. */
export function canViewLead(
  role: Role,
  userId: string,
  lead: { assignedToId: string | null },
): boolean {
  if (can(role, "lead:viewAll")) return true;
  return lead.assignedToId === userId;
}
