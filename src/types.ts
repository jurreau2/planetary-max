//
// Phase-19 Unified Type Surface
// Re-exports canonical contracts from src/maxos/types.ts only
//

export type {
  JsonPrimitive,
  JsonValue,
  JsonObject,
  IdentityEnvelope,
  GovernanceRule,
  GovernanceEnvelope,
  IdentityMetadata,
  GovernanceMetadata,
  EnforcementMetadata,
  RouteMetadata,
  TraceMetadata,
  EnvelopeMetadata,
  Envelope,
  EnforcedEnvelope,
  Lane,
  LaneResponse,
  UniverseResponse,
  SIMResponse,
  TECResponse,
  OrchestratedEnvelope,
  NormalizedKernelResponse,
  MaxOsBindings,
  MaxOsVariables,
  MaxOsHonoEnv,
} from './maxos/types';

// Phase-19 Node-Based PlanetaryState (no legacy flat fields)
export type PlanetaryNodeSnapshot = {
  id?: string;
  nodeId?: string;
  tick?: number;
  identity?: { id: string; signature: string };
  identities?: { id: string; signature: string }[];
  quantum?: { overlay?: null; branches?: [] };
  substrate?: { stability: number };
  substrates?: { stability: number }[];
  canon?: { truths: []; signature: string };
  truthSignatures?: Record<string, string>;
  inferenceDelta?: Record<string, unknown>;
};

export type PlanetaryState = {
  nodes: PlanetaryNodeSnapshot[];
  globalTick?: number;
  synchronizedAt?: number;
  packetSignature?: string;
};

// Backward compat: Bindings type
export type Bindings = Record<string, unknown>;

// Legacy type aliases for Phase‑19 compatibility
export type KernelEnvelope = Envelope;
export type KernelResult = NormalizedKernelResponse;

// Re-export commonly used types
export type {
  EpistemicTimeline,
  InstituteCanon,
  InstituteState,
  QuantumOverlay,
  SimAgentState,
  SimSubstrateState,
  SimTecTaskState,
  SimWindowState,
} from './types';
