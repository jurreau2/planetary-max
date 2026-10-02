//
// Phase-19 Unified Type Surface
// Re-exports canonical contracts from src/maxos/types.ts only
//

export type {
  JsonPrimitive,
  JsonValue,
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

// Phase-19 Governance & Quantum Types
export type UmbrellaMode = 'off' | 'advisory' | 'strict';

export type QuantumGovernanceContext = {
  mode: UmbrellaMode;
  identity?: string;
};

// Phase-19 Identity Types
export type PlanetaryIdentity = {
  id: string;
  credential?: string;
  signature?: string;
};

// Phase-19 Inference Types
export type InferenceFact = {
  id: string;
  content: unknown;
  confidence: number;
};

export type InferenceHypothesis = {
  id: string;
  content: unknown;
  supportingFacts: string[];
  confidence?: number;
};

export type InferenceRecommendation = {
  id: string;
  content: unknown;
  confidence: number;
};

export type PortalKernelState = {
  identity: PlanetaryIdentity;
  governance: QuantumGovernanceContext;
  timestamp: number;
  stability?: number;
};

// Phase-19 Quantum Types
export type QuantumBranch = {
  id: string;
  state: unknown;
  probability: number;
};

export type QuantumCollapsePolicy = 'deterministic' | 'probabilistic' | 'deferred';

// Phase-19 SIM Types (preventing circular re-exports)
export type EpistemicTimeline = Record<string, unknown>;
export type InstituteCanon = Record<string, unknown>;
export type InstituteState = Record<string, unknown>;
export type QuantumOverlay = Record<string, unknown>;
export type SimAgentState = Record<string, unknown>;
export type SimSubstrateState = Record<string, unknown>;
export type SimTecTaskState = Record<string, unknown>;
export type SimWindowState = Record<string, unknown>;
