import { describe, expect, it } from "vitest";
import { evaluateAutonomy, scoreAutonomy } from "../src/autonomy-evaluation";
import { captureEvolutionTrace } from "../src/evolution-trace";
import { checkMetaConsistency } from "../src/meta-consistency";
import { refineAutonomyMode } from "../src/autonomy-refinement";
import { applySelfFeedback } from "../src/self-feedback";

describe("PHASE 19: Autonomy self-referential kernel", () => {
  const baseMeta = {
    source: "kernel",
    lane: "sim",
    autonomy: "core",
    timestamp: Date.now(),
    autonomyState: { phases: [14, 15, 16] },
  };

  it("autonomy evaluation is JSON-safe and stable", () => {
    const eva = evaluateAutonomy(baseMeta);
    expect(eva).toEqual(expect.objectContaining({
      mode: "core",
      phases: [14, 15, 16],
      score: expect.any(Number),
      stable: true,
    }));
    expect(() => JSON.stringify(eva)).not.toThrow();
  });

  it("autonomy score is deterministic and bounded", () => {
    const score = scoreAutonomy(baseMeta);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("evolution trace is ordered and capture is deterministic", () => {
    const trace = captureEvolutionTrace({ meta: baseMeta });
    expect(trace.isOrdered).toBe(true);
    expect(trace.ordered).toEqual([14, 15, 16]);
  });

  it("meta consistency checker never mutates required fields", () => {
    const original = JSON.parse(JSON.stringify(baseMeta));
    const result = checkMetaConsistency(baseMeta);

    expect(result.preserved).toEqual({
      source: "kernel",
      lane: "sim",
      autonomy: "core",
      timestamp: original.timestamp,
    });
    expect(baseMeta).toEqual(original);
  });

  it("refined autonomy mode is deterministic", () => {
    const refined = refineAutonomyMode({
      ...baseMeta,
      autonomyScore: 0.9,
      autonomyState: { phases: [14, 15, 16, 17, 18] },
      consistency: { valid: true },
    });
    expect(refined).toBe("full");
  });

  it("feedback loop maintains KernelResult shape and is JSON-safe", () => {
    const result = {
      ok: true,
      type: "test.operation",
      identity: "operator",
      route: ["sim"],
      result: { ok: true },
      meta: {
        ...baseMeta,
        autonomyScore: 0.8,
        consistency: { valid: true },
      },
    };

    const feedback = applySelfFeedback(result);
    expect(feedback.accepted).toBe(true);
    expect(feedback.maintainedShape).toBe(true);
    expect(() => JSON.stringify(feedback)).not.toThrow();
  });
});
