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
  type RuntimeState,
  type AutonomyMode,
} from "../src/kernel-evolution";
import type { KernelResult, KernelEnvelope, GovernanceMetadata } from "../src/types";

describe("Kernel Evolution — Autonomous Phase Integration", () => {
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
        meta: { source: "test" },
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

  describe("RuntimeState Extraction", () => {
    it("extractRuntimeState normalizes KernelResult", () => {
      const runtime = extractRuntimeState(mockResult, mockEnvelope, mockGovernance);
      expect(runtime.kernelState).toBeDefined();
      expect(runtime.simCoreState).toBeDefined();
      expect(runtime.identity).toBeDefined();
      expect(runtime.meta).toBeDefined();
      expect(runtime.storage).toBeDefined();
      expect(runtime.governanceContext).toBeDefined();
    });

    it("extractRuntimeState handles missing fields gracefully", () => {
      const minimal: KernelResult = { ok: true, status: 200, body: {} };
      const runtime = extractRuntimeState(minimal, mockEnvelope, mockGovernance);
      expect(runtime.simCoreState.stability).toBeDefined();
      expect(runtime.identity.id).toBe("agent-1");
    });

    it("extractRuntimeState uses envelope identity as fallback", () => {
      const minimal: KernelResult = { ok: true, status: 200, body: {} };
      const runtime = extractRuntimeState(minimal, mockEnvelope, mockGovernance);
      expect(runtime.identity.id).toBe("agent-1");
    });
  });

  describe("RuntimeState Assembly", () => {
    it("assembleKernelResult preserves original shape", () => {
      const runtime = extractRuntimeState(mockResult, mockEnvelope, mockGovernance);
      const assembled = assembleKernelResult(mockResult, runtime, "core", ["phase-14"]);
      expect(assembled.ok).toBe(mockResult.ok);
      expect(assembled.status).toBe(mockResult.status);
    });

    it("assembleKernelResult enriches meta with autonomy field", () => {
      const runtime = extractRuntimeState(mockResult, mockEnvelope, mockGovernance);
      const assembled = assembleKernelResult(mockResult, runtime, "core", ["phase-14"]);
      const body = assembled.body;
      expect(typeof body === "object" && body !== null).toBe(true);
      if (typeof body === "object" && body !== null) {
        expect((body as any).meta.autonomy).toBeDefined();
        expect((body as any).meta.autonomy.mode).toBe("core");
        expect((body as any).meta.autonomy.phasesExecuted).toContain("phase-14");
      }
    });

    it("assembleKernelResult preserves all runtime state fields", () => {
      const runtime: RuntimeState = {
        kernelState: { sim: { stability: 0.8 }, windows: {}, identity: {}, tec: {}, substrate: { stability: 0.8 } },
        simCoreState: { tick: 1, stability: 0.75, confidence: 0.8 },
        identity: { id: "evolved-agent" },
        meta: { evolved: true },
        storage: { knowledge: [] },
        governanceContext: { mode: "advisory", decision: "allow" },
      };
      const assembled = assembleKernelResult(mockResult, runtime, "full", ["phase-18"]);
      const body = assembled.body;
      if (typeof body === "object" && body !== null) {
        expect((body as any).simCoreState).toBeDefined();
        expect((body as any).identity).toBeDefined();
        expect((body as any).storage).toBeDefined();
      }
    });
  });

  describe("KernelContext Building", () => {
    it("buildKernelContext assembles all context fields", () => {
      const runtime = extractRuntimeState(mockResult, mockEnvelope, mockGovernance);
      const context = buildKernelContext(runtime, mockEnvelope);
      expect(context.identity).toBeDefined();
      expect(context.meta).toBeDefined();
      expect(context.governanceContext).toBeDefined();
      expect(context.simCoreState).toBeDefined();
      expect(context.storage).toBeDefined();
      expect(context.envelope).toBe(mockEnvelope);
    });

    it("buildKernelContext uses envelope.payload as event", () => {
      const runtime = extractRuntimeState(mockResult, mockEnvelope, mockGovernance);
      const context = buildKernelContext(runtime, mockEnvelope);
      expect(context.event).toEqual(mockEnvelope.payload);
    });
  });

  describe("Phase Execution", () => {
    let runtime: RuntimeState;
    let context: any;

    beforeEach(() => {
      runtime = extractRuntimeState(mockResult, mockEnvelope, mockGovernance);
      context = buildKernelContext(runtime, mockEnvelope);
    });

    it("executePhase14 evolves simCoreState", () => {
      const evolved = executePhase14(runtime, context);
      expect((evolved.simCoreState as any)?.tick).toBe((runtime.simCoreState as any).tick + 1);
      expect(evolved.meta).not.toBe(runtime.meta);
    });

    it("executePhase15 enriches meta with truth", () => {
      const evolved = executePhase15(runtime, context);
      expect((evolved.meta as any)?.truth).toBeDefined();
      expect((evolved.storage as any)?.knowledge).toBeDefined();
    });

    it("executePhase16 adds mesh metadata", () => {
      const evolved = executePhase16(runtime, context);
      expect((evolved.meta as any)?.meshRoute).toBeDefined();
      expect((evolved.meta as any)?.identityPropagation).toBeDefined();
    });

    it("executePhase17 adds quantum metadata", () => {
      const evolved = executePhase17(runtime, context);
      expect((evolved.meta as any)?.blue).toBeDefined();
      expect((evolved.meta as any)?.marketModal).toBeDefined();
    });

    it("executePhase18 marks autonomous", () => {
      const evolved = executePhase18(runtime, context);
      expect((evolved.meta as any)?.autonomy).toBe(true);
      expect((evolved.storage as any)?.autonomy).toBe(true);
    });
  });

  describe("Result Evolution", () => {
    it("evolveKernelResult with mode 'off' returns unchanged result", () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "off");
      expect(evolved).toEqual(mockResult);
    });

    it("evolveKernelResult with mode 'core' executes phases 14-15", () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      const body = evolved.body;
      expect(typeof body === "object" && body !== null).toBe(true);
      if (typeof body === "object" && body !== null) {
        const autonomy = (body as any).meta?.autonomy;
        expect(autonomy?.phasesExecuted).toContain("phase-14-sim-core-evolution");
        expect(autonomy?.phasesExecuted).toContain("phase-15-truth-engine");
        expect(autonomy?.phasesExecuted?.length).toBe(2);
      }
    });

    it("evolveKernelResult with mode 'full' executes all phases", () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "full");
      const body = evolved.body;
      expect(typeof body === "object" && body !== null).toBe(true);
      if (typeof body === "object" && body !== null) {
        const autonomy = (body as any).meta?.autonomy;
        expect(autonomy?.phasesExecuted?.length).toBe(5);
        expect(autonomy?.phasesExecuted).toContain("phase-18-full-autonomy");
      }
    });

    it("evolveKernelResult ignores failed results", () => {
      const failed: KernelResult = { ok: false, status: 500, body: { error: "test" } };
      const evolved = evolveKernelResult(failed, mockEnvelope, mockGovernance, "full");
      expect(evolved).toEqual(failed);
    });

    it("evolveKernelResult preserves result shape", () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      expect(evolved.ok).toBe(mockResult.ok);
      expect(evolved.status).toBe(mockResult.status);
      expect(typeof evolved.body).toBe("object");
    });
  });

  describe("Result Validation", () => {
    it("validateEvolvedResult accepts valid results", () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      const validation = validateEvolvedResult(evolved);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it("validateEvolvedResult rejects invalid ok field", () => {
      const invalid: KernelResult = { ok: "yes" as any, status: 200, body: {} };
      const validation = validateEvolvedResult(invalid);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it("validateEvolvedResult rejects invalid status field", () => {
      const invalid: KernelResult = { ok: true, status: "ok" as any, body: {} };
      const validation = validateEvolvedResult(invalid);
      expect(validation.valid).toBe(false);
    });

    it("validateEvolvedResult checks meta.autonomy shape", () => {
      const result: KernelResult = {
        ok: true,
        status: 200,
        body: { meta: { autonomy: "invalid" } },
      };
      const validation = validateEvolvedResult(result);
      expect(validation.valid).toBe(false);
    });
  });

  describe("Full Integration Flow", () => {
    it("Extracts → Evolves → Assembles → Validates without error", () => {
      const runtime = extractRuntimeState(mockResult, mockEnvelope, mockGovernance);
      const context = buildKernelContext(runtime, mockEnvelope);
      const evolved = executePhase14(runtime, context);
      const assembled = assembleKernelResult(mockResult, evolved, "core", ["phase-14"]);
      const validation = validateEvolvedResult(assembled);
      expect(validation.valid).toBe(true);
    });

    it("evolveKernelResult is a complete integration", () => {
      const evolved = evolveKernelResult(mockResult, mockEnvelope, mockGovernance, "core");
      const validation = validateEvolvedResult(evolved);
      expect(validation.valid).toBe(true);
      expect(evolved.ok).toBe(true);
      expect(typeof evolved.body === "object").toBe(true);
    });
  });
});
