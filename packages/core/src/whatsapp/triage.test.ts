import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadStatus, LeadTemperature, type PrismaClient } from "@leadguardian/db";

const { mockChangeLeadStatus, mockAssignNextVendedor } = vi.hoisted(() => ({
  mockChangeLeadStatus: vi.fn(),
  mockAssignNextVendedor: vi.fn(),
}));

vi.mock("../leads/status", () => ({ changeLeadStatus: mockChangeLeadStatus }));
vi.mock("../leads/distribution", () => ({ assignNextVendedor: mockAssignNextVendedor }));

// vitest hoists vi.mock calls above imports, so this resolves to the mocked modules.
import { completeTriage } from "./triage";

function fakePrisma() {
  return { lead: { update: vi.fn().mockResolvedValue({}) } } as unknown as PrismaClient;
}

describe("completeTriage", () => {
  beforeEach(() => {
    mockChangeLeadStatus.mockReset();
    mockAssignNextVendedor.mockReset();
  });

  it("frio: records the temperature but does not distribute or change status", async () => {
    const prisma = fakePrisma();

    await completeTriage(prisma, "tenant-1", "lead-1", LeadTemperature.FRIO);

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: "lead-1", tenantId: "tenant-1" },
      data: { temperature: LeadTemperature.FRIO },
    });
    expect(mockChangeLeadStatus).not.toHaveBeenCalled();
    expect(mockAssignNextVendedor).not.toHaveBeenCalled();
  });

  it("quente: transitions to NOVO and distributes via the existing round-robin", async () => {
    const prisma = fakePrisma();

    await completeTriage(prisma, "tenant-1", "lead-1", LeadTemperature.QUENTE);

    expect(mockChangeLeadStatus).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ tenantId: "tenant-1", leadId: "lead-1", to: LeadStatus.NOVO }),
    );
    expect(mockAssignNextVendedor).toHaveBeenCalledWith(prisma, "tenant-1", "lead-1");
  });

  it("morno: also transitions and distributes, same as quente", async () => {
    const prisma = fakePrisma();

    await completeTriage(prisma, "tenant-1", "lead-1", LeadTemperature.MORNO);

    expect(mockChangeLeadStatus).toHaveBeenCalled();
    expect(mockAssignNextVendedor).toHaveBeenCalled();
  });
});
