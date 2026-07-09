import { describe, expect, it } from "vitest";
import { LeadStatus } from "@leadguardian/db";
import { canTransition } from "./status";

describe("canTransition", () => {
  it("allows NOVO -> EM_ATENDIMENTO", () => {
    expect(canTransition(LeadStatus.NOVO, LeadStatus.EM_ATENDIMENTO)).toBe(true);
  });

  it("allows a lead to be lost from any open status", () => {
    expect(canTransition(LeadStatus.NOVO, LeadStatus.PERDIDO)).toBe(true);
    expect(canTransition(LeadStatus.EM_ATENDIMENTO, LeadStatus.PERDIDO)).toBe(true);
    expect(canTransition(LeadStatus.EM_NEGOCIACAO, LeadStatus.PERDIDO)).toBe(true);
  });

  it("rejects skipping straight from NOVO to GANHO", () => {
    expect(canTransition(LeadStatus.NOVO, LeadStatus.GANHO)).toBe(false);
  });

  it("treats GANHO and PERDIDO as terminal", () => {
    expect(canTransition(LeadStatus.GANHO, LeadStatus.EM_ATENDIMENTO)).toBe(false);
    expect(canTransition(LeadStatus.PERDIDO, LeadStatus.EM_ATENDIMENTO)).toBe(false);
  });
});
