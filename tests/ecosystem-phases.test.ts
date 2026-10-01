import { describe, it, expect } from "vitest";
import {
  simCoreEvolution,
  simCorePredict,
  computeCurvatureFeedback,
  resolveUmbrellaIntelligence,
  telemetryPredict,
  truthEngineEvaluate,
  knowledgeIndex,
  knowledgeQuery,
  identityCanonUpdate,
  meshRoute,
  propagateIdentityAcrossKernels,
  resolveGlobalUmbrellaField,
  quantumStateInitialize,
  quantumStateStep,
  blueResolve,
  marketModalEvaluate,
  simCoreAutonomous,
  identityAutonomous,
  umbrellaSelfCorrect,
  stabilizeCollapseVector,
  patternIndexAutonomous,
  integratePhase14,
  integratePhase15,
  integratePhase16,
  integratePhase17,
  integratePhase18,
  completeUmbrellaEcosystem,
  type JsonObject,
  type JsonValue,
  type KernelContext,
} from "../src/ecosystem-architecture";

describe("Ecosystem Architecture — Phase 14-18", () => {
  const isJsonSafe = (value: JsonValue): boolean => {
    try {
      JSON.stringify(value);
      return true;
    } catch {
      return false;
    }
  };

  const isObject = (value: JsonValue): boolean =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  describe("Phase 14 — SIM Core Evolution", () => {
    it("simCoreEvolution returns JSON-safe object", () => {
      const input: JsonObject = { stability: 0.7, volatility: 0.3, tick: 10 };
      const result = simCoreEvolution(input);
      expect(isJsonSafe(result)).toBe(true);
      expect(isObject(result)).toBe(true);
    });

    it("simCoreEvolution preserves input and evolves stability", () => {
      const input: JsonObject = { stability: 0.5 };
      const result = simCoreEvolution(input);
      expect(result.tick).toBeDefined();
      expect(typeof result.stability).toBe("number");
      expect(result.stability).toBeGreaterThanOrEqual(0);
      expect(result.stability).toBeLessThanOrEqual(1);
    });

    it("simCorePredict produces forecast with scenario", () => {
      const state: JsonObject = { confidence: 0.7, volatility: 0.3 };
      const result = simCorePredict(state, 0.5);
      expect(isJsonSafe(result)).toBe(true);
      expect(result.forecast).toBeDefined();
      expect(["stable", "adaptive", "volatile"]).toContain(result.forecast?.scenario);
    });
  });

  describe("Phase 14 — Curvature & Intelligence", () => {
    it("computeCurvatureFeedback returns bounded number", () => {
      const identity: JsonObject = { curvature: 0.5 };
      const simCore: JsonObject = { stability: 0.7, confidence: 0.8 };
      const result = computeCurvatureFeedback(identity, simCore);
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it("resolveUmbrellaIntelligence integrates all signals", () => {
      const context: KernelContext = {
        identity: { curvature: 0.6 },
        simCoreState: { confidence: 0.75 },
        governanceContext: { mode: "strict" },
        meta: { telemetryBias: 0.5 },
      };
      const result = resolveUmbrellaIntelligence(context);
      expect(isJsonSafe(result)).toBe(true);
      expect(result.umbrellaField).toBeDefined();
      expect(["strict", "advisory", "off"]).toContain(result.umbrellaField?.mode);
    });
  });

  describe("Phase 14 — Telemetry", () => {
    it("telemetryPredict returns prediction with anomalyRisk", () => {
      const event: JsonObject = { energy: 0.7, latency: 100, variance: 0.3 };
      const result = telemetryPredict(event);
      expect(isJsonSafe(result)).toBe(true);
      expect(result.prediction).toBeDefined();
      expect(typeof result.prediction?.anomalyRisk).toBe("number");
      expect(["elevated", "stable"]).toContain(result.prediction?.latencyTrend);
    });
  });

  describe("Phase 15 — Truth Engine", () => {
    it("truthEngineEvaluate produces truth verdict", () => {
      const context: KernelContext = {
        identity: { curvature: 0.75 },
        simCoreState: { confidence: 0.8 },
        governanceContext: { mode: "strict" },
        meta: { truthConfidence: 0.7 },
      };
      const result = truthEngineEvaluate(context);
      expect(isJsonSafe(result)).toBe(true);
      expect(["stable", "provisional", "unstable"]).toContain(result.verdict);
      expect(result.evidence).toBeDefined();
    });
  });

  describe("Phase 15 — Knowledge Substrate", () => {
    it("knowledgeIndex records and returns indexed event", () => {
      const event: JsonObject = { kind: "test", payload: "data" };
      const indexed = knowledgeIndex(event);
      expect(isJsonSafe(indexed)).toBe(true);
      expect(typeof indexed.id).toBe("string");
      expect(indexed.indexedAt).toBeDefined();
    });

    it("knowledgeQuery filters stored events", () => {
      knowledgeIndex({ test: true });
      knowledgeIndex({ test: false });
      const results = knowledgeQuery({ test: true });
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("Phase 15 — Identity Canon", () => {
    it("identityCanonUpdate increments version and computes curvature", () => {
      const identity: JsonObject = { id: "agent-1", version: 1 };
      const simCore: JsonObject = { stability: 0.7, confidence: 0.8 };
      const result = identityCanonUpdate(identity, simCore);
      expect(isJsonSafe(result)).toBe(true);
      expect(result.version).toBe(2);
      expect(result.canonical).toBe(true);
      expect(typeof result.curvature).toBe("number");
    });
  });

  describe("Phase 16 — Planetary Mesh", () => {
    it("meshRoute creates deterministic route from envelope", () => {
      const envelope = {
        lane: "umbrella" as const,
        identity: "agent-1",
        payload: {},
        governance: null,
      };
      const result = meshRoute(envelope);
      expect(isJsonSafe(result)).toBe(true);
      expect(result.route).toBeDefined();
      expect(["governance", "kernel"]).toContain(result.route?.destination);
    });

    it("propagateIdentityAcrossKernels returns replica map", () => {
      const identity: JsonObject = { id: "agent-1" };
      const result = propagateIdentityAcrossKernels(identity);
      expect(isJsonSafe(result)).toBe(true);
      expect(Array.isArray(result.replicas)).toBe(true);
      expect(result.propagated).toBe(true);
    });

    it("resolveGlobalUmbrellaField extends umbrella intelligence", () => {
      const context: KernelContext = {
        identity: { curvature: 0.6 },
        simCoreState: { confidence: 0.75 },
        governanceContext: { mode: "strict" },
        meta: {},
      };
      const result = resolveGlobalUmbrellaField(context);
      expect(isJsonSafe(result)).toBe(true);
      expect(result.globalField).toBeDefined();
      expect(result.globalField?.active).toBe(true);
    });
  });

  describe("Phase 17 — Quantum State", () => {
    it("quantumStateInitialize returns initialized state", () => {
      const context: KernelContext = {
        simCoreState: { tick: 10, confidence: 0.75 },
        meta: { coherence: 0.7 },
      };
      const result = quantumStateInitialize(context);
      expect(isJsonSafe(result)).toBe(true);
      expect(result.initialized).toBe(true);
      expect(result.state).toBeDefined();
    });

    it("quantumStateStep evolves state with input", () => {
      const state: JsonObject = {
        state: { tick: 5, amplitude: 0.7, coherence: 0.7 },
      };
      const result = quantumStateStep(state, 0.5);
      expect(isJsonSafe(result)).toBe(true);
      expect((result.state as JsonObject)?.tick).toBe(6);
      expect(typeof (result.state as JsonObject)?.amplitude).toBe("number");
    });

    it("blueResolve produces branch resolution", () => {
      const event: JsonObject = { branch: "blue", confidence: 0.8 };
      const result = blueResolve(event);
      expect(isJsonSafe(result)).toBe(true);
      expect(result.resolved).toBe(true);
      expect(result.branch).toBeDefined();
    });

    it("marketModalEvaluate rates market regime", () => {
      const context: KernelContext = {
        meta: { marketConfidence: 0.8 },
        simCoreState: { confidence: 0.8 },
      };
      const result = marketModalEvaluate(context);
      expect(isJsonSafe(result)).toBe(true);
      expect(["bullish", "adaptive", "defensive"]).toContain(result.marketModal?.regime);
    });
  });

  describe("Phase 18 — Full Autonomy", () => {
    it("simCoreAutonomous marks autonomous flag", () => {
      const state: JsonObject = { stability: 0.7, volatility: 0.3 };
      const result = simCoreAutonomous(state);
      expect(isJsonSafe(result)).toBe(true);
      expect(result.autonomous).toBe(true);
      expect(result.selfEvolving).toBe(true);
    });

    it("identityAutonomous applies physics and autonomy", () => {
      const identity: JsonObject = { id: "agent-1", curvature: 0.5 };
      const simCore: JsonObject = { stability: 0.8, confidence: 0.8 };
      const result = identityAutonomous(identity, simCore);
      expect(isJsonSafe(result)).toBe(true);
      expect(result.autonomous).toBe(true);
      expect(result.identityPhysics).toBeDefined();
    });

    it("umbrellaSelfCorrect returns corrected context", () => {
      const context: KernelContext = {
        identity: { curvature: 0.5 },
        governanceContext: { mode: "strict" },
        simCoreState: { confidence: 0.75 },
      };
      const result = umbrellaSelfCorrect(context);
      expect(isJsonSafe(result)).toBe(true);
      expect(result.corrected).toBe(true);
      expect(result.selfRepair).toBeDefined();
    });

    it("stabilizeCollapseVector clamps values to [0,1]", () => {
      const vector: JsonObject = { a: 0.5, b: 1.5, c: -0.3 };
      const result = stabilizeCollapseVector(vector);
      expect(isJsonSafe(result)).toBe(true);
      expect(result.stabilized).toBe(true);
      expect((result.vector as JsonObject)?.a).toBeLessThanOrEqual(1);
      expect((result.vector as JsonObject)?.b).toBeLessThanOrEqual(1);
      expect((result.vector as JsonObject)?.c).toBeGreaterThanOrEqual(0);
    });

    it("patternIndexAutonomous indexes patterns with confidence", () => {
      const patterns: JsonValue[] = [{ type: "A" }, { type: "B" }, { type: "C" }];
      const result = patternIndexAutonomous(patterns);
      expect(isJsonSafe(result)).toBe(true);
      expect(result.autonomous).toBe(true);
      expect(result.count).toBe(3);
      expect(Array.isArray(result.patterns)).toBe(true);
    });
  });

  describe("Phase Integration", () => {
    it("integratePhase14 evolves simCoreState and umbrella", () => {
      const state: JsonObject = { simCoreState: { tick: 0, stability: 0.7 } };
      const context: KernelContext = { input: 0.5 };
      const result = integratePhase14(state, context);
      expect(isJsonSafe(result)).toBe(true);
      expect((result.simCoreState as JsonObject)?.tick).toBe(1);
      expect((result.meta as JsonObject)?.simCoreEvolution).toBeDefined();
    });

    it("integratePhase15 adds truth engine and knowledge", () => {
      const state: JsonObject = { meta: {}, storage: {} };
      const context: KernelContext = { event: { test: true } };
      const result = integratePhase15(state, context);
      expect(isJsonSafe(result)).toBe(true);
      expect((result.meta as JsonObject)?.truth).toBeDefined();
      expect((result.storage as JsonObject)?.knowledge).toBeDefined();
    });

    it("integratePhase16 adds mesh routes and propagation", () => {
      const state: JsonObject = { meta: {} };
      const context: KernelContext = { identity: { id: "test" } };
      const result = integratePhase16(state, context);
      expect(isJsonSafe(result)).toBe(true);
      expect((result.meta as JsonObject)?.meshRoute).toBeDefined();
      expect((result.meta as JsonObject)?.identityPropagation).toBeDefined();
    });

    it("integratePhase17 adds quantum and market", () => {
      const state: JsonObject = { meta: {}, context: {} };
      const context: KernelContext = { simCoreState: { confidence: 0.75 } };
      const result = integratePhase17(state, context);
      expect(isJsonSafe(result)).toBe(true);
      expect((result.meta as JsonObject)?.blue).toBeDefined();
      expect((result.meta as JsonObject)?.marketModal).toBeDefined();
    });

    it("integratePhase18 marks autonomous and stabilizes", () => {
      const state: JsonObject = {
        simCoreState: { stability: 0.7 },
        identity: { id: "test" },
        meta: {},
        storage: {},
      };
      const context: KernelContext = { governanceContext: { mode: "strict" } };
      const result = integratePhase18(state, context);
      expect(isJsonSafe(result)).toBe(true);
      expect((result.meta as JsonObject)?.autonomy).toBe(true);
      expect((result.storage as JsonObject)?.autonomy).toBe(true);
      expect((result.meta as JsonObject)?.collapseVector).toBeDefined();
    });

    it("completeUmbrellaEcosystem chains all phases", () => {
      const state: JsonObject = {
        simCoreState: { tick: 0, stability: 0.7 },
        identity: { id: "test", curvature: 0.5 },
        meta: {},
        storage: {},
      };
      const context: KernelContext = {
        governanceContext: { mode: "strict" },
        input: 0.5,
      };
      const result = completeUmbrellaEcosystem(state, context);
      expect(isJsonSafe(result)).toBe(true);
      expect((result.meta as JsonObject)?.autonomy).toBe(true);
      expect((result.storage as JsonObject)?.autonomy).toBe(true);
    });
  });
});
