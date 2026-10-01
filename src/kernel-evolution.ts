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

export type AutonomyMode = "full" | "core" | "off";

export type KernelAutonomyMeta = Readonly<{
  mode: AutonomyMode;
  phasesExecuted: readonly string[];
  timestamp: number;
}>;

export type KernelMeta = Readonly<{
  source: string;
  lane: string;
  autonomy?: KernelAutonomyMeta;
  [key: string]: unknown;
}>;

export type RuntimeState = Readonly<{
  kernelState: PortalKernelState;
  simCoreState: JsonObject;
  identity: JsonObject;
  meta: KernelMeta;
  storage: JsonObject;
  governanceContext: JsonObject;
}>;

function normalizeMeta(meta: unknown, fallback: { source: string; lane: string }): KernelMeta {
  const base = (typeof meta === "object" && meta !== null ? (meta as JsonObject) : {}) as JsonObject;
  const lane = typeof base.lane === "string" ? base.lane : fallback.lane;
  const source = typeof base.source === "string" ? base.source : fallback.source;

  const autonomy =
    typeof base.autonomy === "object" && base.autonomy !== null && !Array.isArray(base.autonomy)
      ? {
          mode: (() => {
            const mode = (base.autonomy as JsonObject).mode;
            return mode === "full" || mode === "core" || mode === "off" ? mode : "core";
          })(),
          phasesExecuted: Array.isArray((base.autonomy as JsonObject).phasesExecuted)
            ? ((base.autonomy as JsonObject).phasesExecuted as unknown[]).map((value) => String(value))
            : [],
          timestamp: Number((base.autonomy as JsonObject).timestamp ?? Date.now()),
        }
      : undefined;

  const normalized: JsonObject = {
    source,
    lane,
    ...base,
  };

  if (autonomy !== undefined) {
    normalized.autonomy = autonomy;
  }

  return normalized as KernelMeta;
}

export function extractRuntimeState(
  result: KernelResult,
  envelope: KernelEnvelope,
  governance: GovernanceMetadata
): RuntimeState {
  const body = typeof result.body === "object" && result.body !== null ? (result.body as JsonObject) : {};

  return {
    kernelState: (body.kernelState as PortalKernelState) || {},
    simCoreState: (body.simCoreState as JsonObject) || { tick: 0, stability: 0.7, confidence: 0.7 },
    identity: (body.identity as JsonObject) || { id: envelope.identity || "system" },
    meta: normalizeMeta(body.meta || { source: "kernel-lane", lane: envelope.lane }, {
      source: "kernel-lane",
      lane: envelope.lane,
    }),
    storage: (body.storage as JsonObject) || {},
    governanceContext: (governance as JsonObject) || { mode: "strict", decision: "allow" },
  };
}

export function assembleKernelResult(
  original: KernelResult,
  evolved: RuntimeState,
  autonomyMode: AutonomyMode,
  phases: string[]
): KernelResult {
  const originalMeta =
    typeof original.body === "object" && original.body !== null
      ? ((original.body as JsonObject).meta as JsonObject | undefined) ?? {}
      : {};

  const nextAutonomy: KernelAutonomyMeta = {
    mode: autonomyMode,
    phasesExecuted: phases,
    timestamp: Date.now(),
  };

  const nextMeta = normalizeMeta(
    {
      ...originalMeta,
      ...evolved.meta,
      source: evolved.meta.source || originalMeta.source || "kernel-lane",
      lane: evolved.meta.lane || originalMeta.lane || "sim",
      autonomy: nextAutonomy,
    },
    {
      source: "kernel-lane",
      lane: "sim",
    },
  );

  return {
    ...original,
    body: {
      ...(typeof original.body === "object" && original.body !== null ? (original.body as JsonObject) : {}),
      kernelState: evolved.kernelState,
      simCoreState: evolved.simCoreState,
      identity: evolved.identity,
      meta: nextMeta,
      storage: evolved.storage,
      governanceContext: evolved.governanceContext,
    },
  };
}

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

export function executePhase14(state: RuntimeState, context: KernelContext): RuntimeState {
  const evolved = integratePhase14(state, context);
  return {
    ...state,
    simCoreState: (evolved.simCoreState as JsonObject) || state.simCoreState,
    meta: normalizeMeta(evolved.meta, { source: state.meta.source, lane: state.meta.lane }),
    governanceContext: (evolved.governanceContext as JsonObject) || state.governanceContext,
  };
}

export function executePhase15(state: RuntimeState, context: KernelContext): RuntimeState {
  const evolved = integratePhase15(state, context);
  return {
    ...state,
    meta: normalizeMeta(evolved.meta, { source: state.meta.source, lane: state.meta.lane }),
    storage: (evolved.storage as JsonObject) || state.storage,
  };
}

export function executePhase16(state: RuntimeState, context: KernelContext): RuntimeState {
  const evolved = integratePhase16(state, context);
  return {
    ...state,
    meta: normalizeMeta(evolved.meta, { source: state.meta.source, lane: state.meta.lane }),
    governanceContext: (evolved.governanceContext as JsonObject) || state.governanceContext,
  };
}

export function executePhase17(state: RuntimeState, context: KernelContext): RuntimeState {
  const evolved = integratePhase17(state, context);
  return {
    ...state,
    meta: normalizeMeta(evolved.meta, { source: state.meta.source, lane: state.meta.lane }),
  };
}

export function executePhase18(state: RuntimeState, context: KernelContext): RuntimeState {
  const evolved = integratePhase18(state, context);
  return {
    ...state,
    simCoreState: (evolved.simCoreState as JsonObject) || state.simCoreState,
    identity: (evolved.identity as JsonObject) || state.identity,
    meta: normalizeMeta(evolved.meta, { source: state.meta.source, lane: state.meta.lane }),
    governanceContext: (evolved.governanceContext as JsonObject) || state.governanceContext,
    storage: (evolved.storage as JsonObject) || state.storage,
  };
}

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

  evolved = executePhase14(evolved, context);
  phases.push("phase-14-sim-core-evolution");

  evolved = executePhase15(evolved, context);
  phases.push("phase-15-truth-engine");

  if (autonomyMode === "full") {
    evolved = executePhase16(evolved, context);
    phases.push("phase-16-mesh-federation");

    evolved = executePhase17(evolved, context);
    phases.push("phase-17-quantum-structured");

    evolved = executePhase18(evolved, context);
    phases.push("phase-18-full-autonomy");
  }

  return assembleKernelResult(result, evolved, autonomyMode, phases);
}

export function validateEvolvedResult(result: KernelResult): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof result.ok !== "boolean") errors.push("result.ok must be boolean");
  if (!Number.isFinite(result.status)) errors.push("result.status must be finite number");
  if (result.body === undefined) errors.push("result.body must be defined");

  const body = result.body;
  if (typeof body === "object" && body !== null) {
    const meta = (body as JsonObject).meta;
    if (meta !== undefined && typeof meta !== "object") {
      errors.push("result.body.meta must be object or undefined");
    } else if (meta && typeof meta === "object") {
      const metaRecord = meta as JsonObject;
      if (typeof metaRecord.source !== "string") errors.push("result.body.meta.source must be string");
      if (typeof metaRecord.lane !== "string") errors.push("result.body.meta.lane must be string");
      if (metaRecord.autonomy !== undefined) {
        const autonomy = metaRecord.autonomy as JsonObject;
        if (typeof autonomy.mode !== "string") errors.push("result.body.meta.autonomy.mode must be string");
        if (!Array.isArray(autonomy.phasesExecuted)) {
          errors.push("result.body.meta.autonomy.phasesExecuted must be an array");
        }
        if (typeof autonomy.timestamp !== "number") {
          errors.push("result.body.meta.autonomy.timestamp must be a number");
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
