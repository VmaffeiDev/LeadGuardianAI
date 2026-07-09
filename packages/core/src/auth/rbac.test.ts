import { describe, expect, it } from "vitest";
import { Role } from "@leadguardian/db";
import { can, canViewLead } from "./rbac";

describe("rbac", () => {
  it("only ADMIN and GESTOR can manage vendedores", () => {
    expect(can(Role.ADMIN, "vendedor:manage")).toBe(true);
    expect(can(Role.GESTOR, "vendedor:manage")).toBe(true);
    expect(can(Role.TRATADOR, "vendedor:manage")).toBe(false);
    expect(can(Role.VENDEDOR, "vendedor:manage")).toBe(false);
  });

  it("vendedor can only view their own lead", () => {
    const own = { assignedToId: "user-1" };
    const other = { assignedToId: "user-2" };
    expect(canViewLead(Role.VENDEDOR, "user-1", own)).toBe(true);
    expect(canViewLead(Role.VENDEDOR, "user-1", other)).toBe(false);
  });

  it("gestor can view any lead", () => {
    expect(canViewLead(Role.GESTOR, "user-1", { assignedToId: "user-2" })).toBe(true);
  });
});
