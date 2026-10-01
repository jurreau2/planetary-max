import { describe, it, expect, beforeEach } from "vitest";
import {
  extractRuntimeState,
  assembleKernelResult,
  buildKernelContext,
  executePhase14,
  executePhase15,
  executePhase16,
  executePhase17,
  executePhase18,
  evolveKernelResult,
  validateEvolvedResult,
  normalizeMeta,
  type RuntimeState,
  type AutonomyMode,
  type KernelMeta,
  type KernelAutonomyMeta,
} from "../src/kernel-evolution";
import type { KernelResult, KernelEnvelope, GovernanceMetadata } from "../src/types";

describe("Autonomy Mode Switching — Runtime Tests", () => {
  let mockResult: KernelResult;
  let mockEnvelope: KernelEnvelope;
  let mockGovernance: GovernanceMetadata;

  beforeEach(() => {
    mockResult = {
      ok: true,
      status: 200,
      body: {
        kernelState: { sim: { stability: 1 }, windows: {}, identity: {}, tec: {}, substrate: { stability: 1 } },
        simCoreState: { tick: 0, stability: 0.7, confidence: 0.75 },
        identity: { id: "agent-1" },
        meta: { source: "test-lane", lane: "sim" },
        storage: {},
      },
    };

    mockEnvelope = {
      lane: "sim" as const,
      payload: { test: "data" },
      identity: "agent-1",
      governance: null,
    };

    mockGovernance = {
      mode: "strict" as const,
      decision: "allow" as const,
    };
  });

  describe("Metadata Normalization", () => {
    it("normalizeMeta accepts valid KernelMeta", () => {
      const input = { source: "test", lane: "sim", custom: "field" };
      const result = normalizeMeta(input, { source: "default", lane: "default" });
      expect(result.source).toBe("test");
      expect(result.lane).toBe("sim");
      expect(result.custom).toBe("field");
    });

    it("normalizeMeta fills missing source and lane with fallback", () => {
      const input = { custom: "field" };
      const result = normalizeMeta(input, { source: "fallback-source", lane: "fallback-lane" });
      expect(result.source).toBe("fallback-source");
      expect(result.lane).toBe("fallback-lane");
    });

    it("normalizeMeta validates autonomy.mode enum", () => {
      const input = {
        source: "test",
        lane: "sim",
        autonomy: { mode: "invalid" as any, phasesExecuted: [], timestamp: Date.now() },
      };
      const result = normalizeMeta(input, { source: "default", lane: "default" });
      expect(result.autonomy?.mode).toBe("core"); // coerces to default
    });

    it("normalizeMeta normalizes autonomy.phasesExecuted to string array", () => {
      const input = {
        source: "test",
        lane: "sim",
        autonomy: { mode: "full", phasesExecuted: [14, 15, 16], timestamp: Date.now() },
      };
      const result = normalizeMeta(input, { source: "default", lane: "default" });
      expect(result.autonomy?.phasesExecuted).toEqual(["14", "15", "16"]);
    });
  });

  describe('Autonomy Mode "off"', () => {
    it('evolveKernelResult with mode "off" returns result unchanged', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "off");
      expect(evolved).toEqual(mockResult);
    });

    it('evolveKernelResult with mode "off" does not add autonomy metadata', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "off");
      const body = evolved.body as any;
      expect(body.meta?.autonomy).toBeUndefined();
    });

    it('mode "off" passes through failed results unchanged', () => {
      const failed: KernelResult = { ok: false, status: 500, body: { error: "test" } };
      const evolved = evolveKernelResult(failed, mockEnvelope, mockGovernance, "off");
      expect(evolved).toEqual(failed);
    });
  });

  describe('Autonomy Mode "core"', () => {
    it('evolveKernelResult with mode "core" executes phases 14-15', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      const body = evolved.body as any;
      const autonomy = body.meta?.autonomy as KernelAutonomyMeta | undefined;
      expect(autonomy?.mode).toBe("core");
      expect(autonomy?.phasesExecuted).toHaveLength(2);
      expect(autonomy?.phasesExecuted).toContain("phase-14-sim-core-evolution");
      expect(autonomy?.phasesExecuted).toContain("phase-15-truth-engine");
    });

    it('mode "core" does not execute phases 16-18', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      const body = evolved.body as any;
      const autonomy = body.meta?.autonomy as KernelAutonomyMeta | undefined;
      expect(autonomy?.phasesExecuted).not.toContain("phase-16-mesh-federation");
      expect(autonomy?.phasesExecuted).not.toContain("phase-17-quantum-structured");
      expect(autonomy?.phasesExecuted).not.toContain("phase-18-full-autonomy");
    });

    it('mode "core" enriches simCoreState with evolution', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      const body = evolved.body as any;
      expect(body.simCoreState.tick).toBe(1); // evolved by phase 14
      expect(body.meta.simCoreEvolution).toBeDefined(); // added by phase 14
    });

    it('mode "core" enriches meta with truth engine results', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      const body = evolved.body as any;
      expect(body.meta.truth).toBeDefined(); // added by phase 15
      expect(body.storage.knowledge).toBeDefined(); // added by phase 15
    });

    it('mode "core" does not add mesh, quantum, or full autonomy data', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      const body = evolved.body as any;
      expect(body.meta.meshRoute).toBeUndefined();
      expect(body.meta.blue).toBeUndefined();
      expect(body.storage.autonomy).toBeUndefined();
    });
  });

  describe('Autonomy Mode "full"', () => {
    it('evolveKernelResult with mode "full" executes all phases 14-18', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "full");
      const body = evolved.body as any;
      const autonomy = body.meta?.autonomy as KernelAutonomyMeta | undefined;
      expect(autonomy?.mode).toBe("full");
      expect(autonomy?.phasesExecuted).toHaveLength(5);
      expect(autonomy?.phasesExecuted).toContain("phase-14-sim-core-evolution");
      expect(autonomy?.phasesExecuted).toContain("phase-15-truth-engine");
      expect(autonomy?.phasesExecuted).toContain("phase-16-mesh-federation");
      expect(autonomy?.phasesExecuted).toContain("phase-17-quantum-structured");
      expect(autonomy?.phasesExecuted).toContain("phase-18-full-autonomy");
    });

    it('mode "full" includes all ecosystem layers', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "full");
      const body = evolved.body as any;

      // Phase 14-15
      expect(body.meta.simCoreEvolution).toBeDefined();
      expect(body.meta.truth).toBeDefined();

      // Phase 16
      expect(body.meta.meshRoute).toBeDefined();
      expect(body.meta.identityPropagation).toBeDefined();

      // Phase 17
      expect(body.meta.blue).toBeDefined();
      expect(body.meta.marketModal).toBeDefined();

      // Phase 18
      expect(body.meta.autonomy.mode).toBe("full");
      expect(body.storage.autonomy).toBe(true);
    });

    it('mode "full" marks identity as autonomous', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "full");
      const body = evolved.body as any;
      expect(body.identity.autonomous).toBe(true);
    });

    it('mode "full" stabilizes collapse vector', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "full");
      const body = evolved.body as any;
      expect(body.meta.collapseVector).toBeDefined();
      expect(body.meta.collapseVector.stabilized).toBe(true);
    });

    it('mode "full" includes pattern index', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "full");
      const body = evolved.body as any;
      expect(body.meta.patternIndex).toBeDefined();
      expect(body.meta.patternIndex.autonomous).toBe(true);
    });
  });

  describe("Mode Switching Behavior", () => {
    it("switching from off → core evolves the result", () => {
      const offResult = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "off");
      const coreResult = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");

      const offBody = offResult.body as any;
      const coreBody = coreResult.body as any;

      expect(offBody.simCoreState.tick).toBe(0); // unchanged
      expect(coreBody.simCoreState.tick).toBe(1); // evolved
      expect(coreBody.meta.simCoreEvolution).toBeDefined();
    });

    it("switching from core → full adds mesh, quantum, and autonomy layers", () => {
      const coreResult = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      const fullResult = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "full");

      const coreBody = coreResult.body as any;
      const fullBody = fullResult.body as any;

      expect(coreBody.meta.meshRoute).toBeUndefined();
      expect(fullBody.meta.meshRoute).toBeDefined();

      expect(coreBody.meta.blue).toBeUndefined();
      expect(fullBody.meta.blue).toBeDefined();

      expect(coreBody.storage.autonomy).toBeUndefined();
      expect(fullBody.storage.autonomy).toBe(true);
    });

    it("autonomy mode is recorded in result metadata", () => {
      const offResult = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "off");
      const coreResult = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      const fullResult = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "full");

      // off mode doesn't add autonomy metadata since result is unchanged
      expect((offResult.body as any).meta?.autonomy).toBeUndefined();

      // core and full modes record their mode
      expect((coreResult.body as any).meta?.autonomy?.mode).toBe("core");
      expect((fullResult.body as any).meta?.autonomy?.mode).toBe("full");
    });
  });

  describe("Failed Results Bypass Evolution", () => {
    it("failed results are not evolved regardless of mode", () => {
      const failed: KernelResult = { ok: false, status: 500, body: { error: "test error" } };

      const offResult = evolveKernelResult(failed, mockEnvelope, mockGovernance, "off");
      const coreResult = evolveKernelResult(failed, mockEnvelope, mockGovernance, "core");
      const fullResult = evolveKernelResult(failed, mockEnvelope, mockGovernance, "full");

      expect(offResult).toEqual(failed);
      expect(coreResult).toEqual(failed);
      expect(fullResult).toEqual(failed);
    });

    it("failed results do not have autonomy metadata added", () => {
      const failed: KernelResult = { ok: false, status: 500, body: { error: "test error" } };
      const evolved = evolveKernelResult(failed, mockEnvelope, mockGovernance, "core");
      const body = evolved.body as any;
      expect(body.meta?.autonomy).toBeUndefined();
    });
  });

  describe("Metadata Validation", () => {
    it('validates that "off" mode preserves result shape', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "off");
      const validation = validateEvolvedResult(evolved);
      expect(validation.valid).toBe(true);
    });

    it('validates that "core" mode produces valid metadata', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      const validation = validateEvolvedResult(evolved);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('validates that "full" mode produces valid metadata', () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "full");
      const validation = validateEvolvedResult(evolved);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("detects missing source in meta", () => {
      const result: KernelResult = {
        ok: true,
        status: 200,
        body: { meta: { lane: "sim" } },
      };
      const validation = validateEvolvedResult(result);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("source"))).toBe(true);
    });

    it("detects missing lane in meta", () => {
      const result: KernelResult = {
        ok: true,
        status: 200,
        body: { meta: { source: "test" } },
      };
      const validation = validateEvolvedResult(result);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("lane"))).toBe(true);
    });

    it("detects invalid autonomy.mode", () => {
      const result: KernelResult = {
        ok: true,
        status: 200,
        body: {
          meta: {
            source: "test",
            lane: "sim",
            autonomy: { mode: "invalid" as any, phasesExecuted: [], timestamp: Date.now() },
          },
        },
      };
      const validation = validateEvolvedResult(result);
      expect(validation.valid).toBe(false);
    });

    it("detects non-array phasesExecuted", () => {
      const result: KernelResult = {
        ok: true,
        status: 200,
        body: {
          meta: {
            source: "test",
            lane: "sim",
            autonomy: { mode: "core", phasesExecuted: "not-array" as any, timestamp: Date.now() },
          },
        },
      };
      const validation = validateEvolvedResult(result);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("phasesExecuted"))).toBe(true);
    });

    it("detects non-number timestamp", () => {
      const result: KernelResult = {
        ok: true,
        status: 200,
        body: {
          meta: {
            source: "test",
            lane: "sim",
            autonomy: { mode: "core", phasesExecuted: [], timestamp: "not-number" as any },
          },
        },
      };
      const validation = validateEvolvedResult(result);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("timestamp"))).toBe(true);
    });
  });

  describe("Default Mode Behavior", () => {
    it("evolveKernelResult defaults to core mode when not specified", () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance);
      const body = evolved.body as any;
      const autonomy = body.meta?.autonomy as KernelAutonomyMeta | undefined;
      expect(autonomy?.mode).toBe("core");
      expect(autonomy?.phasesExecuted).toHaveLength(2);
    });

    it("default mode includes phases 14-15 but not 16-18", () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance);
      const body = evolved.body as any;
      const autonomy = body.meta?.autonomy as KernelAutonomyMeta | undefined;
      expect(autonomy?.phasesExecuted).toContain("phase-14-sim-core-evolution");
      expect(autonomy?.phasesExecuted).toContain("phase-15-truth-engine");
      expect(autonomy?.phasesExecuted).not.toContain("phase-16-mesh-federation");
    });
  });

  describe("Autonomy Metadata Lifecycle", () => {
    it("autonomy timestamp is set during assembly", () => {
      const before = Date.now();
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      const after = Date.now();

      const body = evolved.body as any;
      const timestamp = (body.meta?.autonomy as KernelAutonomyMeta)?.timestamp;

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it("multiple evolutions with same result produce different timestamps", () => {
      const evolved1 = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      const timestamp1 = ((evolved1.body as any).meta?.autonomy as KernelAutonomyMeta)?.timestamp;

      // small delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      const evolved2 = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      const timestamp2 = ((evolved2.body as any).meta?.autonomy as KernelAutonomyMeta)?.timestamp;

      expect(timestamp2).toBeGreaterThan(timestamp1);
    });

    it("phases are recorded in execution order", () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "full");
      const body = evolved.body as any;
      const phases = (body.meta?.autonomy as KernelAutonomyMeta)?.phasesExecuted;

      const phase14Index = phases?.indexOf("phase-14-sim-core-evolution") ?? -1;
      const phase15Index = phases?.indexOf("phase-15-truth-engine") ?? -1;
      const phase16Index = phases?.indexOf("phase-16-mesh-federation") ?? -1;
      const phase18Index = phases?.indexOf("phase-18-full-autonomy") ?? -1;

      expect(phase14Index).toBeLessThan(phase15Index);
      expect(phase15Index).toBeLessThan(phase16Index);
      expect(phase16Index).toBeLessThan(phase18Index);
    });
  });
});
