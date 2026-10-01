import { describe, expect, it } from "vitest";
import { checkMetaConsistency } from "../src/meta-consistency";

describe("phase19-meta-consistency", () => {
  it("valid reports consistency and preserves required fields", () => {
    const meta = {
      source: "kernel",
      lane: "sim",
      autonomy: "core",
      timestamp: Date.now(),
      autonomyState: { phases: [14, 15, 16] },
    };

    const result = checkMetaConsistency(meta);
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.preserved).toEqual({
      source: "kernel",
      lane: "sim",
      autonomy: "core",
      timestamp: meta.timestamp,
    });
  });

  it("marks invalid when required fields are missing", () => {
    const result = checkMetaConsistency({
      source: "kernel",
      lane: "sim",
    });

    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});
