export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

export type JsonObject = { [key: string]: JsonValue };

export type KernelContext = Readonly<{
  identity?: JsonObject;
  meta?: JsonObject;
  governanceContext?: JsonObject;
  simCoreState?: JsonObject;
  quantumState?: JsonObject;
  storage?: JsonObject;
  event?: JsonObject;
  envelope?: import("./types").KernelEnvelope;
  input?: JsonValue;
}>;

const asObject = (value: JsonValue | undefined, fallback: JsonObject = {}): JsonObject => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return fallback;
};

const coerceNumber = (value: JsonValue | undefined, fallback: number): number => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

const average = (...values: number[]): number => {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, entry) => sum + entry, 0);
  return total / values.length;
};

export function simCoreEvolution(state: JsonObject): JsonObject {
  const current = asObject(state);
  const stability = clampUnit(coerceNumber(current.stability, 0.72) + 0.04);
  const volatility = clampUnit(coerceNumber(current.volatility, 0.24) - 0.02);
  const confidence = clampUnit(average(stability, 1 - volatility, coerceNumber(current.confidence, 0.78)));

  return {
    ...current,
    tick: coerceNumber(current.tick, 0) + 1,
    stability,
    volatility,
    confidence,
    evolution: {
      direction: stability >= 0.75 ? "adaptive" : "rebalancing",
      momentum: Number((confidence * 0.9 + volatility * 0.1).toFixed(6)),
      drift: Number((coerceNumber(current.drift, 0.02) + 0.01).toFixed(6)),
    },
  };
}

export function simCorePredict(state: JsonObject, input: JsonValue): JsonObject {
  const snapshot = asObject(state);
  const next = asObject(simCoreEvolution(snapshot));
  const baseline = coerceNumber(next.confidence, 0.7);
  const inputSignal = typeof input === "number" ? input : 0.5;
  const prediction = clampUnit(baseline + inputSignal * 0.25 - coerceNumber(snapshot.volatility, 0.25) * 0.1);

  return {
    ...next,
    input,
    prediction,
    forecast: {
      horizon: "next-tick",
      expectedConfidence: prediction,
      scenario: prediction >= 0.75 ? "stable" : prediction >= 0.5 ? "adaptive" : "volatile",
    },
  };
}

export function computeCurvatureFeedback(identity: JsonObject, simCore: JsonObject): number {
  const identityState = asObject(identity);
  const sim = asObject(simCore);
  const baseCurvature = coerceNumber(identityState.curvature, 0.5);
  const stability = coerceNumber(sim.stability, 0.7);
  const confidence = coerceNumber(sim.confidence, 0.7);
  return Number((baseCurvature * 0.5 + (1 - stability) * 0.25 + (1 - confidence) * 0.25).toFixed(6));
}

export function resolveUmbrellaIntelligence(context: KernelContext): JsonObject {
  const governance = asObject(context.governanceContext);
  const meta = asObject(context.meta);
  const identity = asObject(context.identity);
  const simCoreState = asObject(context.simCoreState);

  const umbrellaField = {
    mode: typeof governance.mode === "string" ? governance.mode : "strict",
    identitySignal: coerceNumber(identity.curvature, 0.5),
    simSignal: coerceNumber(simCoreState.confidence, 0.7),
    telemetryBias: coerceNumber(meta.telemetryBias, 0.5),
    decision: coerceNumber(governance.threshold, 0.6) >= 0.6 ? "allow" : "review",
  };

  return {
    umbrellaField,
    intelligence: {
      integrity: clampUnit(average(umbrellaField.identitySignal, umbrellaField.simSignal, umbrellaField.telemetryBias)),
      source: "umbrella-core",
      updatedAt: Date.now(),
    },
  };
}

export function telemetryPredict(event: JsonObject): JsonObject {
  const telemetry = asObject(event);
  const energy = coerceNumber(telemetry.energy, 0.5);
  const latency = coerceNumber(telemetry.latency, 120);
  const variance = clampUnit(energy / Math.max(latency, 1) * 100);

  return {
    ...telemetry,
    prediction: {
      anomalyRisk: clampUnit(variance * 0.7 + (coerceNumber(telemetry.variance, 0.5) * 0.3)),
      latencyTrend: latency > 100 ? "elevated" : "stable",
      confidence: clampUnit(1 - variance * 0.5),
    },
  };
}

export function truthEngineEvaluate(context: KernelContext): JsonObject {
  const meta = asObject(context.meta);
  const governance = asObject(context.governanceContext);
  const identity = asObject(context.identity);
  const simCoreState = asObject(context.simCoreState);

  const truthScore = clampUnit(
    average(
      coerceNumber(identity.curvature, 0.5),
      coerceNumber(simCoreState.confidence, 0.75),
      coerceNumber(governance.threshold, 0.6),
      coerceNumber(meta.truthConfidence, 0.7),
    ),
  );

  return {
    truthScore,
    verdict: truthScore >= 0.75 ? "stable" : truthScore >= 0.5 ? "provisional" : "unstable",
    evidence: {
      identity: identity.id ?? "unknown",
      simCore: simCoreState.tick ?? 0,
      governance: governance.mode ?? "strict",
    },
  };
}

const knowledgeStore: JsonValue[] = [];

export function knowledgeIndex(event: JsonValue): JsonObject {
  const record = {
    id: `knowledge:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    event,
    indexedAt: Date.now(),
  };
  knowledgeStore.push(record);
  return record;
}

export function knowledgeQuery(criteria: JsonObject): JsonValue[] {
  const keys = Object.keys(criteria);
  if (keys.length === 0) return [...knowledgeStore];

  return knowledgeStore.filter((record) => {
    if (typeof record !== "object" || record === null || Array.isArray(record)) return false;
    const candidate = record as JsonObject;
    return keys.every((key) => {
      const expected = criteria[key];
      const actual = candidate[key];
      if (typeof expected === "object" && expected !== null && !Array.isArray(expected)) {
        return typeof actual === "object" && actual !== null && !Array.isArray(actual)
          ? Object.keys(expected as JsonObject).every((subKey) => {
              const current = (actual as JsonObject)[subKey];
              return current === (expected as JsonObject)[subKey];
            })
          : false;
      }
      return actual === expected;
    });
  });
}

export function identityCanonUpdate(identity: JsonObject, simCore: JsonObject): JsonObject {
  const canonical = asObject(identity);
  const core = asObject(simCore);
  const curvature = computeCurvatureFeedback(canonical, core);

  return {
    ...canonical,
    canonical: true,
    curvature,
    simCoreSignature: typeof core.signature === "string" ? core.signature : "sim-core",
    version: coerceNumber(canonical.version, 1) + 1,
  };
}

export function meshRoute(envelope: import("./types").KernelEnvelope): JsonObject {
  const lane = envelope.lane ?? "sim";
  const identity = typeof envelope.identity === "string" ? envelope.identity : "system";
  const payload = asObject(envelope.payload as JsonValue | undefined, {});

  return {
    route: {
      lane,
      identity,
      type: envelope.type ?? "kernel.message",
      destination: lane === "umbrella" ? "governance" : "kernel",
    },
    payload,
    nextStep: "dispatch",
  };
}

export function propagateIdentityAcrossKernels(identity: JsonObject): JsonObject {
  const source = asObject(identity);
  return {
    source: source.id ?? "unknown",
    propagated: true,
    replicas: [
      { kernel: "portal-os", identity: source },
      { kernel: "planetary-max", identity: source },
      { kernel: "max-os-1", identity: source },
    ],
  };
}

export function resolveGlobalUmbrellaField(context: KernelContext): JsonObject {
  const umbrella = resolveUmbrellaIntelligence(context);
  return {
    ...umbrella,
    globalField: {
      active: true,
      scope: "ecosystem",
      mode: umbrella.umbrellaField.mode,
      signal: umbrella.intelligence.integrity,
    },
  };
}

export function quantumStateInitialize(context: KernelContext): JsonObject {
  const simCoreState = asObject(context.simCoreState);
  const meta = asObject(context.meta);

  return {
    state: {
      tick: coerceNumber(simCoreState.tick, 0),
      amplitude: coerceNumber(simCoreState.confidence, 0.7),
      coherence: coerceNumber(meta.coherence, 0.7),
    },
    initialized: true,
  };
}

export function quantumStateStep(state: JsonObject, input: JsonValue): JsonObject {
  const current = asObject(state);
  const currentState = asObject(current.state);
  const signal = typeof input === "number" ? input : coerceNumber(currentState.amplitude, 0.7);
  const nextAmplitude = clampUnit(coerceNumber(currentState.amplitude, 0.7) + signal * 0.1);

  return {
    ...current,
    state: {
      ...currentState,
      tick: coerceNumber(currentState.tick, 0) + 1,
      amplitude: nextAmplitude,
      coherence: clampUnit(nextAmplitude * 0.9),
    },
  };
}

export function blueResolve(event: JsonValue): JsonObject {
  const payload = asObject(event);
  return {
    resolved: true,
    branch: payload.branch ?? "blue",
    confidence: clampUnit(coerceNumber(payload.confidence, 0.75)),
    output: { substrate: "blue", mode: "resolve" },
  };
}

export function marketModalEvaluate(context: KernelContext): JsonObject {
  const meta = asObject(context.meta);
  const simCore = asObject(context.simCoreState);
  const marketSignal = average(
    coerceNumber(meta.marketConfidence, 0.6),
    coerceNumber(simCore.confidence, 0.7),
    coerceNumber(meta.telemetryBias, 0.5),
  );

  return {
    marketModal: {
      score: clampUnit(marketSignal),
      regime: marketSignal >= 0.75 ? "bullish" : marketSignal >= 0.5 ? "adaptive" : "defensive",
    },
    updatedAt: Date.now(),
  };
}

export function simCoreAutonomous(state: JsonObject): JsonObject {
  const evolved = simCoreEvolution(asObject(state));
  return {
    ...evolved,
    autonomous: true,
    selfEvolving: true,
  };
}

export function identityAutonomous(identity: JsonObject, simCore: JsonObject): JsonObject {
  const base = asObject(identity);
  const evolved = identityCanonUpdate(base, simCore);
  return {
    ...evolved,
    autonomous: true,
    identityPhysics: {
      curvature: computeCurvatureFeedback(base, simCore),
      selfAdjusting: true,
    },
  };
}

export function umbrellaSelfCorrect(context: KernelContext): JsonObject {
  const umbrella = resolveUmbrellaIntelligence(context);
  const corrected = {
    ...umbrella,
    corrected: true,
    selfRepair: {
      mode: umbrella.umbrellaField.mode,
      integrity: umbrella.intelligence.integrity,
    },
  };

  return corrected;
}

export function stabilizeCollapseVector(vector: JsonObject): JsonObject {
  const values = asObject(vector);
  const normalized: JsonObject = {};
  for (const [key, value] of Object.entries(values)) {
    const nextValue = typeof value === "number" ? clampUnit(value) : 0;
    normalized[key] = Number(nextValue.toFixed(6));
  }
  return {
    vector: normalized,
    stabilized: true,
    magnitude: Object.values(normalized).reduce((sum, value) => sum + Number(value), 0),
  };
}

export function patternIndexAutonomous(patterns: JsonValue[]): JsonObject {
  const indexed = patterns.map((pattern, index) => ({
    id: `pattern:${index}`,
    pattern,
    confidence: clampUnit(0.5 + index * 0.1),
  }));

  return {
    patterns: indexed,
    autonomous: true,
    count: indexed.length,
  };
}

export function integratePhase14(state: JsonObject = {}, context: KernelContext = {}): JsonObject {
  const simCoreState = simCoreEvolution(asObject(state.simCoreState));
  const forecast = simCorePredict(simCoreState, context.input ?? {});
  const nextMeta = asObject(state.meta);
  const nextGovernance = asObject(context.governanceContext);

  return {
    ...state,
    simCoreState,
    meta: {
      ...nextMeta,
      simCoreEvolution: simCoreState,
      simCorePredict: forecast,
    },
    governanceContext: {
      ...nextGovernance,
      umbrellaIntelligence: resolveUmbrellaIntelligence({ ...context, simCoreState }),
    },
  };
}

export function integratePhase15(state: JsonObject = {}, context: KernelContext = {}): JsonObject {
  const truth = truthEngineEvaluate({ ...context, simCoreState: asObject(state.simCoreState) });
  const indexed = knowledgeIndex(context.event ?? {});
  const nextStorage = asObject(state.storage);
  const nextMeta = asObject(state.meta);

  return {
    ...state,
    meta: {
      ...nextMeta,
      truth,
    },
    storage: {
      ...nextStorage,
      knowledge: knowledgeQuery({}),
      knowledgeIndex: indexed,
    },
  };
}

export function integratePhase16(state: JsonObject = {}, context: KernelContext = {}): JsonObject {
  const identity = asObject(context.identity);
  const nextMeta = asObject(state.meta);
  const route = meshRoute({
    lane: "umbrella",
    payload: context.event ?? {},
    identity: typeof identity.id === "string" ? identity.id : "system",
    governance: null,
  } as import("./types").KernelEnvelope);

  return {
    ...state,
    meta: {
      ...nextMeta,
      meshRoute: route,
      identityPropagation: propagateIdentityAcrossKernels(identity),
    },
    governanceContext: {
      ...asObject(context.governanceContext),
      globalUmbrellaField: resolveGlobalUmbrellaField({ ...context, identity }),
    },
  };
}

export function integratePhase17(state: JsonObject = {}, context: KernelContext = {}): JsonObject {
  const quantumState = quantumStateInitialize({ ...context, simCoreState: asObject(state.simCoreState) });
  const stepped = quantumStateStep(quantumState, context.input ?? {});
  const nextMeta = asObject(state.meta);

  return {
    ...state,
    context: {
      ...asObject(state.context),
      quantumState: stepped,
    },
    meta: {
      ...nextMeta,
      blue: blueResolve(context.event ?? {}),
      marketModal: marketModalEvaluate({ ...context, simCoreState: asObject(state.simCoreState) }),
    },
  };
}

export function integratePhase18(state: JsonObject = {}, context: KernelContext = {}): JsonObject {
  const autonomousSimCore = simCoreAutonomous(asObject(state.simCoreState));
  const identity = asObject(context.identity);
  const autonomousIdentity = identityAutonomous(identity, autonomousSimCore);
  const nextMeta = asObject(state.meta);
  const nextStorage = asObject(state.storage);

  return {
    ...state,
    simCoreState: autonomousSimCore,
    identity: autonomousIdentity,
    meta: {
      ...nextMeta,
      autonomy: true,
      collapseVector: stabilizeCollapseVector(asObject(nextMeta.collapseVector)),
      patternIndex: patternIndexAutonomous(Array.isArray(state.patterns) ? state.patterns : []),
    },
    governanceContext: {
      ...asObject(context.governanceContext),
      umbrellaSelfCorrect: umbrellaSelfCorrect({ ...context, simCoreState: autonomousSimCore }),
    },
    storage: {
      ...nextStorage,
      autonomy: true,
    },
  };
}

export type AutonomyMode = "off" | "core" | "full";

const normalizeAutonomyMode = (value: JsonValue | undefined): AutonomyMode => {
  if (value === "off" || value === "core" || value === "full") return value;
  return "off";
};

const getAutonomyPhases = (value: JsonValue | undefined): number[] => {
  const fallback = [14, 15, 16, 17, 18];
  if (!Array.isArray(value)) return fallback;
  const phases = value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));
  return phases.length > 0 ? phases : fallback;
};

export function evaluateAutonomy(meta: JsonObject): JsonObject {
  const source = typeof meta.source === "string" ? meta.source : "kernel";
  const lane = typeof meta.lane === "string" ? meta.lane : "sim";
  const autonomy = normalizeAutonomyMode(meta.autonomy as JsonValue | undefined);
  const phases = getAutonomyPhases((asObject(meta.autonomyState) as JsonObject).phases);
  const score = scoreAutonomy(meta);

  return {
    source,
    lane,
    autonomy,
    phases,
    score,
    stable: autonomy !== "off" && phases.length >= 3,
    evaluatedAt: Date.now(),
  };
}

export function scoreAutonomy(meta: JsonObject): number {
  const mode = normalizeAutonomyMode(meta.autonomy as JsonValue | undefined);
  const phases = getAutonomyPhases((asObject(meta.autonomyState) as JsonObject).phases);
  const phaseWeight = phases.length === 0 ? 0 : Math.min(phases.length / 5, 1);
  const modeWeight = mode === "off" ? 0.2 : mode === "core" ? 0.6 : 0.95;
  const sourceWeight = typeof meta.source === "string" ? 0.15 : 0;
  const laneWeight = typeof meta.lane === "string" ? 0.1 : 0;

  return Number(Math.min(1, phaseWeight + modeWeight + sourceWeight + laneWeight).toFixed(3));
}

export function captureEvolutionTrace(result: { meta?: JsonObject }): JsonObject {
  const meta = asObject(result.meta);
  const phases = getAutonomyPhases((asObject(meta.autonomyState) as JsonObject).phases);
  const ordered = [...phases].sort((a, b) => a - b);

  return {
    phases,
    ordered,
    isOrdered: JSON.stringify(phases) === JSON.stringify(ordered),
    capturedAt: Date.now(),
  };
}

export function checkMetaConsistency(meta: JsonObject): JsonObject {
  const required = ["source", "lane", "autonomy", "timestamp", "autonomyState"];
  const missing = required.filter((field) => meta[field] === undefined || meta[field] === null);
  const autonomyState = asObject(meta.autonomyState);
  const phases = getAutonomyPhases(autonomyState.phases);
  const mode = normalizeAutonomyMode(meta.autonomy as JsonValue | undefined);
  const lane = typeof meta.lane === "string" ? meta.lane : "unknown";
  const source = typeof meta.source === "string" ? meta.source : "unknown";

  return {
    valid: missing.length === 0 && phases.length > 0 && (mode === "off" || mode === "core" || mode === "full"),
    missing,
    mode,
    source,
    lane,
    phases,
    timestamp: typeof meta.timestamp === "number" ? meta.timestamp : null,
    requiredFields: [...required],
    preserved: {
      source,
      lane,
      autonomy: mode,
      timestamp: typeof meta.timestamp === "number" ? meta.timestamp : null,
    },
  };
}

export function refineAutonomyMode(meta: JsonObject): AutonomyMode {
  const consistency = asObject(meta.consistency);
  const score = typeof meta.autonomyScore === "number" ? meta.autonomyScore : scoreAutonomy(meta);
  const mode = normalizeAutonomyMode(meta.autonomy as JsonValue | undefined);
  const phases = getAutonomyPhases((asObject(meta.autonomyState) as JsonObject).phases);
  const isConsistent = consistency.valid === true;

  if (isConsistent && score >= 0.8 && phases.length >= 5) return "full";
  if (isConsistent && score >= 0.45 && phases.length >= 3) return "core";
  if (mode === "full" && score >= 0.7) return "full";
  if (mode === "core" && score >= 0.35) return "core";
  return "off";
}

export function applySelfFeedback(result: { meta?: JsonObject; ok?: boolean }): JsonObject {
  const meta = asObject(result.meta);
  const mode = normalizeAutonomyMode(meta.autonomy as JsonValue | undefined);
  const score = typeof meta.autonomyScore === "number" ? meta.autonomyScore : scoreAutonomy(meta);
  const consistent = asObject(meta.consistency).valid === true;

  const feedback = {
    accepted: Boolean(result.ok !== false),
    mode,
    score,
    consistent,
    recommendedMode: mode === "full" && score >= 0.8 ? "full" : mode === "core" && score >= 0.45 ? "core" : "off",
    appliedAt: Date.now(),
  };

  return {
    ...feedback,
    maintainedShape: true,
  };
}

export function integratePhase19(state: JsonObject = {}, context: KernelContext = {}): JsonObject {
  const nextMeta = asObject(state.meta);
  const autonomyState = asObject(nextMeta.autonomyState);
  const phases = getAutonomyPhases(autonomyState.phases);
  const source = typeof nextMeta.source === "string" ? nextMeta.source : "kernel";
  const lane = typeof nextMeta.lane === "string" ? nextMeta.lane : "sim";
  const autonomy = normalizeAutonomyMode(nextMeta.autonomy as JsonValue | undefined);
  const timestamp = typeof nextMeta.timestamp === "number" ? nextMeta.timestamp : Date.now();

  const baseMeta: JsonObject = {
    ...nextMeta,
    source,
    lane,
    autonomy,
    timestamp,
    autonomyState: {
      ...autonomyState,
      phases,
    },
  };

  const evaluation = evaluateAutonomy(baseMeta);
  const trace = captureEvolutionTrace({ meta: baseMeta });
  const consistency = checkMetaConsistency(baseMeta);
  const refined = refineAutonomyMode({
    ...baseMeta,
    autonomyScore: evaluation.score,
    consistency,
  });
  const feedback = applySelfFeedback({
    ok: consistency.valid,
    meta: {
      ...baseMeta,
      autonomyScore: evaluation.score,
      consistency,
    },
  });

  return {
    ...state,
    meta: {
      ...baseMeta,
      self: {
        evaluation,
        score: evaluation.score,
        trace,
        consistency,
        refined,
        feedback,
      },
    },
  };
}

export function completeUmbrellaEcosystem(state: JsonObject = {}, context: KernelContext = {}): JsonObject {
  const after14 = integratePhase14(state, context);
  const after15 = integratePhase15(after14, context);
  const after16 = integratePhase16(after15, context);
  const after17 = integratePhase17(after16, context);
  const after18 = integratePhase18(after17, context);
  return integratePhase19(after18, context);
}

export default {
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
  integratePhase19,
  completeUmbrellaEcosystem,
  evaluateAutonomy,
  scoreAutonomy,
  captureEvolutionTrace,
  checkMetaConsistency,
  refineAutonomyMode,
  applySelfFeedback,
};

// End of file

