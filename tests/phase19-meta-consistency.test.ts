import { describe, expect, it } from "vitest";
import { evaluateAutonomy, scoreAutonomy } from "../src/autonomy-evaluation";

describe("phase19-evaluation", () => {
  it("returns JSON-safe autonomy evaluation", () => {
    const meta = {
      source: "kernel",
      lane: "sim",
      autonomy: "core",
      timestamp: Date.now(),
      autonomyState: { phases: [14, 15, 16] },
    };

    const evaluation = evaluateAutonomy(meta);
    expect(evaluation.mode).toBe("core");
    expect(evaluation.stable).toBe(true);
    expect(() => JSON.stringify(evaluation)).not.toThrow();
  });

  it("scoreAutonomy produces bounded numeric value", () => {
    const score = scoreAutonomy({
      source: "kernel",
      lane: "sim",
      autonomy: "full",
      timestamp: Date.now(),
      autonomyState: { phases: [14, 15, 16, 17, 18] },
    });

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
