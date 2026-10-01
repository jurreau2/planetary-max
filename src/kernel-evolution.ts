//
// Kernel Evolution Layer
// Autonomous Phase Integration (14-18)
// Bridges lane execution to ecosystem architecture
//

import {
  KernelEnvelope,
  KernelResult,
  PortalKernelState,
  GovernanceMetadata,
} from "./types";
import {
  completeUmbrellaEcosystem,
  integratePhase14,
  integratePhase15,
  integratePhase16,
  integratePhase17,
  integratePhase18,
  type JsonObject,
  type JsonValue,
  type KernelContext,
} from "./ecosystem-architecture";

/**
 * RuntimeState: The evolved kernel state after lane execution but before result assembly.
 * This is where autonomous layers enrich the state and meta.
 */
export type RuntimeState = Readonly<{
  kernelState: PortalKernelState;
  simCoreState: JsonObject;
  identity: JsonObject;
  meta: JsonObject;
  storage: JsonObject;
  governanceContext: JsonObject;
}>;

/**
 * Phase execution mode: which phases to activate.
 * "full" = all phases 14-18 (complete autonomy)
 * "core" = phases 14-15 only (sim + truth engine)
 * "off" = no autonomous phases
 */
export type AutonomyMode = "full" | "core" | "off";

/**
 * Extract RuntimeState from a KernelResult and metadata.
 * This normalizes the result shape into a consistent RuntimeState.
 */
export function extractRuntimeState(
  result: KernelResult,
  envelope: KernelEnvelope,
  governance: GovernanceMetadata
): RuntimeState {
  const body = typeof result.body === "object" && result.body !== null ? (result.body as JsonObject) : {};

  return {
    kernelState: body.kernelState || {},
    simCoreState: body.simCoreState || { tick: 0, stability: 0.7, confidence: 0.7 },
    identity: body.identity || { id: envelope.identity || "system" },
    meta: body.meta || { source: "kernel-lane", lane: envelope.lane },
    storage: body.storage || {},
    governanceContext: governance || { mode: "strict", decision: "allow" },
  };
}

/**
 * Assemble RuntimeState back into a KernelResult.
 * Preserves the original result shape while enriching with autonomous layers.
 */
export function assembleKernelResult(
  original: KernelResult,
  evolved: RuntimeState,
  autonomyMode: AutonomyMode,
  phases: string[]
): KernelResult {
  return {
    ...original,
    body: {
      ...original.body,
      kernelState: evolved.kernelState,
      simCoreState: evolved.simCoreState,
      identity: evolved.identity,
      meta: {
        ...(typeof original.body === "object" && original.body !== null && (original.body as JsonObject).meta
          ? (original.body as JsonObject).meta
          : {}),
        ...evolved.meta,
        autonomy: {
          mode: autonomyMode,
          phasesExecuted: phases,
          timestamp: Date.now(),
        },
      },
      storage: evolved.storage,
      governanceContext: evolved.governanceContext,
    },
  };
}

/**
 * Build the KernelContext passed to autonomous phases.
 * This provides a stable interface for ecosystem functions.
 */
export function buildKernelContext(
  state: RuntimeState,
  envelope: KernelEnvelope,
  payload: JsonValue = {}
): KernelContext {
  return {
    identity: state.identity,
    meta: state.meta,
    governanceContext: state.governanceContext,
    simCoreState: state.simCoreState,
    quantumState: (state.meta.quantumState as JsonObject) || {},
    storage: state.storage,
    event: envelope.payload as JsonObject,
    envelope,
    input: payload,
  };
}

/**
 * Execute Phase 14 (SIM Core Evolution + Umbrella Intelligence)
 */
export function executePhase14(state: RuntimeState, context: KernelContext): RuntimeState {
  const evolved = integratePhase14(state, context);
  return {
    ...state,
    simCoreState: (evolved.simCoreState as JsonObject) || state.simCoreState,
    meta: (evolved.meta as JsonObject) || state.meta,
    governanceContext: (evolved.governanceContext as JsonObject) || state.governanceContext,
  };
}

/**
 * Execute Phase 15 (Truth Engine + Knowledge Substrate)
 */
export function executePhase15(state: RuntimeState, context: KernelContext): RuntimeState {
  const evolved = integratePhase15(state, context);
  return {
    ...state,
    meta: (evolved.meta as JsonObject) || state.meta,
    storage: (evolved.storage as JsonObject) || state.storage,
  };
}

/**
 * Execute Phase 16 (Planetary Mesh + Identity Propagation)
 */
export function executePhase16(state: RuntimeState, context: KernelContext): RuntimeState {
  const evolved = integratePhase16(state, context);
  return {
    ...state,
    meta: (evolved.meta as JsonObject) || state.meta,
    governanceContext: (evolved.governanceContext as JsonObject) || state.governanceContext,
  };
}

/**
 * Execute Phase 17 (Quantum State + Market Modal)
 */
export function executePhase17(state: RuntimeState, context: KernelContext): RuntimeState {
  const evolved = integratePhase17(state, context);
  return {
    ...state,
    meta: (evolved.meta as JsonObject) || state.meta,
  };
}

/**
 * Execute Phase 18 (Full Autonomy + Collapse Stabilization)
 */
export function executePhase18(state: RuntimeState, context: KernelContext): RuntimeState {
  const evolved = integratePhase18(state, context);
  return {
    ...state,
    simCoreState: (evolved.simCoreState as JsonObject) || state.simCoreState,
    identity: (evolved.identity as JsonObject) || state.identity,
    meta: (evolved.meta as JsonObject) || state.meta,
    governanceContext: (evolved.governanceContext as JsonObject) || state.governanceContext,
    storage: (evolved.storage as JsonObject) || state.storage,
  };
}

/**
 * Execute autonomous phases based on mode.
 * Sequences phases 14-18 through RuntimeState, enriching meta and governance.
 *
 * @param result The KernelResult from lane execution
 * @param envelope The original kernel envelope
 * @param governance The umbrella governance context
 * @param autonomyMode Which phases to execute
 * @returns Evolved result with autonomous layers integrated
 */
export function evolveKernelResult(
  result: KernelResult,
  envelope: KernelEnvelope,
  governance: GovernanceMetadata,
  autonomyMode: AutonomyMode = "core"
): KernelResult {
  if (autonomyMode === "off") return result;
  if (!result.ok) return result;

  const runtimeState = extractRuntimeState(result, envelope, governance);
  const context = buildKernelContext(runtimeState, envelope, envelope.payload as JsonValue);

  const phases: string[] = [];
  let evolved = runtimeState;

  // Phase 14: SIM Core Evolution + Umbrella Intelligence
  evolved = executePhase14(evolved, context);
  phases.push("phase-14-sim-core-evolution");

  // Phase 15: Truth Engine + Knowledge Substrate
  evolved = executePhase15(evolved, context);
  phases.push("phase-15-truth-engine");

  // Full mode: continue through phases 16-18
  if (autonomyMode === "full") {
    // Phase 16: Planetary Mesh + Identity Propagation
    evolved = executePhase16(evolved, context);
    phases.push("phase-16-mesh-federation");

    // Phase 17: Quantum State + Market Modal
    evolved = executePhase17(evolved, context);
    phases.push("phase-17-quantum-structured");

    // Phase 18: Full Autonomy + Collapse Stabilization
    evolved = executePhase18(evolved, context);
    phases.push("phase-18-full-autonomy");
  }

  return assembleKernelResult(result, evolved, autonomyMode, phases);
}

/**
 * Validate that an evolved result maintains kernel shape invariants.
 * Used in testing to ensure autonomous layers don't corrupt the result.
 */
export function validateEvolvedResult(result: KernelResult): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof result.ok !== "boolean") errors.push("result.ok must be boolean");
  if (!Number.isFinite(result.status)) errors.push("result.status must be finite number");
  if (result.body === undefined) errors.push("result.body must be defined");

  const body = result.body;
  if (typeof body === "object" && body !== null) {
    if ((body as JsonObject).meta && typeof (body as JsonObject).meta !== "object") {
      errors.push("result.body.meta must be object or undefined");
    }
    if ((body as JsonObject).autonomy && typeof (body as JsonObject).autonomy !== "object") {
      errors.push("result.body.meta.autonomy must be object or undefined");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
