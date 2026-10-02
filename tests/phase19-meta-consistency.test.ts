import { describe, expect, it } from "vitest";
import { evaluateAutonomy } from "../src/autonomy-evaluation";
// scoreAutonomy is deprecated in Phase‑19; remove import entirely.

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
});
