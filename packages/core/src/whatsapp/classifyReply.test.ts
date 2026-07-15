import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

// vitest hoists vi.mock calls above imports, so this resolves to the mocked SDK.
import { classifyReply } from "./classifyReply";

describe("classifyReply", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("parses a QUENTE classification", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: '{"temperature": "QUENTE", "reasoning": "Pediu para agendar test-drive"}' },
      ],
    });

    const result = await classifyReply([
      { direction: "OUT", body: "Olá! Vi que você tem interesse no Onix." },
      { direction: "IN", body: "Sim! Posso agendar um test-drive amanhã?" },
    ]);

    expect(result.temperature).toBe("QUENTE");
    expect(result.reasoning).toContain("test-drive");
  });

  it("handles a response wrapped in markdown code fences", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '```json\n{"temperature": "FRIO", "reasoning": "Pediu para não ser mais contatado"}\n```',
        },
      ],
    });

    const result = await classifyReply([{ direction: "IN", body: "Para de mandar mensagem" }]);

    expect(result.temperature).toBe("FRIO");
  });

  it("throws on an invalid temperature value from the model", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"temperature": "MORNINHO", "reasoning": "..."}' }],
    });

    await expect(classifyReply([{ direction: "IN", body: "..." }])).rejects.toThrow();
  });
});
