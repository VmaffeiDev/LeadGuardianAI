import { describe, expect, it } from "vitest";
import { normalizeWhatsappPhone } from "./phone";

describe("normalizeWhatsappPhone", () => {
  it("adds the Brazilian country code to a local number with DDD", () => {
    expect(normalizeWhatsappPhone("11999998888")).toBe("+5511999998888");
    expect(normalizeWhatsappPhone("1199998888")).toBe("+551199998888");
  });

  it("keeps a number that already has the country code", () => {
    expect(normalizeWhatsappPhone("5511999998888")).toBe("+5511999998888");
  });

  it("strips formatting characters before normalizing", () => {
    expect(normalizeWhatsappPhone("(11) 99999-8888")).toBe("+5511999998888");
    expect(normalizeWhatsappPhone("+55 11 99999-8888")).toBe("+5511999998888");
  });

  it("returns null for numbers with an implausible length", () => {
    expect(normalizeWhatsappPhone("123")).toBeNull();
    expect(normalizeWhatsappPhone("")).toBeNull();
    expect(normalizeWhatsappPhone("abc")).toBeNull();
  });
});
