import { describe, expect, it } from "vitest";
import { parseThresholds } from "./thresholds";

describe("parseThresholds", () => {
  it("returns defaults when raw is not a valid thresholds object", () => {
    expect(parseThresholds(null)).toEqual({ warningMinutes: 15, criticalMinutes: 30 });
    expect(parseThresholds({})).toEqual({ warningMinutes: 15, criticalMinutes: 30 });
    expect(parseThresholds({ warningMinutes: "15" })).toEqual({
      warningMinutes: 15,
      criticalMinutes: 30,
    });
  });

  it("returns the tenant's custom thresholds when valid", () => {
    expect(parseThresholds({ warningMinutes: 5, criticalMinutes: 10 })).toEqual({
      warningMinutes: 5,
      criticalMinutes: 10,
    });
  });
});
