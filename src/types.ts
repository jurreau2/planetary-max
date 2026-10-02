//
// MAX‑Institute Unified Type Surface
// Portal‑OS Wing
// Planetary‑MAX Quantum Substrate
//

// -------------------------------------------------------------
// Core Kernel Types
// -------------------------------------------------------------

export type Bindings = Record<string, unknown>;

export type KernelLane = "sim" | "identity" | "windows" | "tec" | "umbrella";

export type KernelEnvelope = {
  id?: string;
  type?: string;
  lane?: KernelLane;
  payload?: unknown;
  identity?: string | null;
  governance?: GovernanceMetadata | null;
  governanceContext?: Record<string, unknown>;
};

export type KernelResult = {
  ok: boolean;
  status?: number;
  body?: unknown;
  governance?: GovernanceMetadata | null;
  messageId?: unknown;
  type?: unknown;
  identity?: unknown;
  route?: unknown;
  result?: {
    lanes?: Array<{ result?: { results?: Array<{ result?: { data?: unknown } }> } }>;
    [key: string]: unknown;
  };
  error?: { code?: string; message?: string };
  meta?: Record<string, unknown>;
  [key: string]: unknown;
};

export type PortalKernelState = {
  sim: SimSubstrateState;
  windows: Record<string, SimWindowState>;
  identity: Record<string, SimAgentState>;
  tec: Record<string, SimTecTaskState>;
  substrate: SimSubstrateState;
};

// -------------------------------------------------------------
// Governance Types
// -------------------------------------------------------------

export type UmbrellaMode = "strict" | "advisory" | "off";

export type GovernanceMetadata = {
  mode: UmbrellaMode;
  decision: "allow" | "deny" | "advise";
  reason?: string;
};

export type GovernanceInference = {
  confidence: number;
  advisory?: string;
};

// -------------------------------------------------------------
// Simulation Types
// -------------------------------------------------------------

export type SimEventType =
  | "agent.move"
  | "agent.identity"
  | "window.focus"
  | "window.state"
  | "tec.task"
  | "substrate.adjust";

export type SimEvent = {
  id: string;
  type: SimEventType;
  identityId?: string;
  windowId?: string;
  payload?: unknown;
};

export type SimAgentState = {
  id: string;
  position?: { x: number; y: number };
  identity?: string;
};

export type SimWindowState = {
  id: string;
  focusHistory: string[];
  state: Record<string, unknown>;
};

export type SimTecTaskState = {
  id: string;
  kind: string;
  progress: number;
};

export type SimSubstrateState = {
  stability: number;
};

export type SimTickDiff = {
  deltas: Record<string, unknown>;
  events: SimEvent[];
};

// -------------------------------------------------------------
// Quantum Types
// -------------------------------------------------------------

export type QuantumBranch = {
  id: string;
  probability: number;
  stateDelta: Readonly<Record<string, unknown>>;
  signature: string;
  curvature?: number;
  node?: string;
};

export type QuantumCollapsePolicy =
  | "deterministic"
  | "probabilistic"
  | "governed";

export type QuantumOverlay = {
  branches: Readonly<QuantumBranch[]>;
  curvature: number;
  signature: string;
  collapsePolicy: QuantumCollapsePolicy;
};

export type QuantumGovernanceContext = {
  mode: UmbrellaMode;
  identity?: string;
};

export type QuantumSignature = string;

export type QuantumState = {
  overlay: QuantumOverlay | null;
};

// -------------------------------------------------------------
// Planetary Types
// -------------------------------------------------------------

export type PlanetaryIdentity = {
  id: string;
  originNode?: string;
  curvature?: number;
  signature: string;
  timeline?: { identityId?: string; events?: EpistemicEvent[] };
};

export type PlanetaryNode = {
  nodeId: string;
  tick: number;
  identities: PlanetaryIdentity[];
  substrates: PlanetarySubstrate[];
  quantumBranches: QuantumBranch[];
  canon: InstituteCanon;
  truthSignatures: Record<string, string>;
  inferenceDelta?: Record<string, unknown>;
};

export type PlanetaryNodeSnapshot = {
  id?: string;
  nodeId?: string;
  tick?: number;
  identity?: PlanetaryIdentity;
  identities?: PlanetaryIdentity[];
  quantum?: PlanetaryQuantumState;
  quantumBranches?: QuantumBranch[];
  substrate?: PlanetarySubstrate;
  substrates?: PlanetarySubstrate[];
  canon?: PlanetaryCanon;
  truthSignatures?: Record<string, string>;
  inferenceDelta?: Record<string, unknown>;
};

export type PlanetaryQuantumState = {
  overlay?: QuantumOverlay | null;
  branches?: QuantumBranch[];
  globalCurvature?: number;
  globalSignature?: string;
  collapsePolicy?: QuantumCollapsePolicy;
  selectedBranch?: QuantumBranch | null;
};

export type PlanetarySubstrate = {
  id?: string;
  nodeId?: string;
  stability: number;
  topology?: Record<string, unknown>;
  anomalies?: PlanetaryAnomaly[];
  nodes?: string[];
};

export type PlanetaryCanon = {
  truths: InstituteTruth[];
  signature: string;
  version?: number;
  updatedAt?: number;
  globalStability?: number;
};

export type PlanetaryGovernanceContext = {
  mode: UmbrellaMode;
  reason?: string;
  nodePolicies?: Record<string, unknown>;
  globalTruthRules?: Record<string, unknown>;
  collapseRules?: Record<string, unknown>;
};

export type PlanetaryState = {
  nodes: PlanetaryNodeSnapshot[];
  identities?: Record<string, PlanetaryIdentity>;
  substrate?: PlanetarySubstrate;
  substrates?: Record<string, PlanetarySubstrate>;
  quantum?: PlanetaryQuantumState;
  canon?: PlanetaryCanon;
  governance?: PlanetaryGovernanceContext;
  advisories?: string[];
  globalTick?: number;
  synchronizedAt?: number;
  packetSignature?: string;
};

export type PlanetarySynchronization = {
  at?: number;
  coordinatorIdentity?: string;
  nodes: PlanetaryNodeSnapshot[];
  governance?: PlanetaryGovernanceContext;
  collapsePolicy?: PlanetaryQuantumState["collapsePolicy"];
  branches?: QuantumBranch[];
  explicitSync?: boolean;
};

export type PlanetaryAnomaly = {
  kind: string;
  details?: string;
};

// -------------------------------------------------------------
// Institute Types
// -------------------------------------------------------------

export type EpistemicEventAction =
  | "observe"
  | "infer"
  | "update"
  | "reject";

export type EpistemicEvent = {
  id: string;
  action: EpistemicEventAction;
  payload: unknown;
  time: number;
  truthId?: string;
  at?: number;
  meta?: Record<string, unknown>;
};

export type EpistemicTimeline = EpistemicEvent[];

export type InstituteInferenceFact = {
  id: string;
  kind: InferenceFactKind;
  confidence: number;
  payload: unknown;
};

export type InstituteInferenceHypothesis = {
  id: string;
  facts: InstituteInferenceFact[];
  confidence: number;
};

export type InstituteQuantumBranch = QuantumBranch;

export type InstituteSimulationDelta = SimTickDiff;

export type InstituteTruth = {
  id: string;
  createdAt: number;
  updatedAt: number;
  payload: unknown;
  stability: number;
  description?: string;
  sourceFacts?: string[];
  curvature?: number;
};

export type InstituteTruthFormation = {
  truth: InstituteTruth;
  advisory?: string;
};

export type InstituteCanon = {
  truths: InstituteTruth[];
  signature: string;
  version?: number;
  updatedAt?: number;
  globalStability?: number;
};

export type InstituteState = {
  canon: InstituteCanon;
  timeline: EpistemicTimeline;
};

// -------------------------------------------------------------
// Inference Types
// -------------------------------------------------------------

export type InferenceFactKind =
  | "behavior"
  | "identity"
  | "window"
  | "tec"
  | "substrate"
  | "governance";

export type InferenceFact = {
  id: string;
  kind: InferenceFactKind;
  payload: unknown;
};

export type InferenceHypothesis = {
  id: string;
  facts: InferenceFact[];
  confidence: number;
};

export type InferenceRecommendationTarget =
  | "substrate"
  | "identity"
  | "window"
  | "tec";

export type InferenceRecommendation = {
  id: string;
  node?: string;
  target?: InferenceRecommendationTarget;
  probability?: number;
  curvature?: number;
  signature?: string;
  payload?: Record<string, unknown>;
};

export type PlanetaryQuantumStateExtended = Readonly<{
  branches: ReadonlyArray<QuantumBranch>;
  globalCurvature: number;
  globalSignature: string;
  collapsePolicy: "deterministic" | "probabilistic" | "governed";
  selectedBranch: QuantumBranch | null;
}>;

export type PlanetaryCanonExtended = Readonly<{
  truths: Readonly<Record<string, InstituteTruth>>;
  version: number;
  updatedAt: number;
  globalStability: number;
}>;

export type PlanetaryNodeSnapshotExtended = Readonly<{
  nodeId: string;
  tick?: number;
  identities: ReadonlyArray<PlanetaryIdentity>;
  substrates: ReadonlyArray<PlanetarySubstrate>;
  quantumBranches: ReadonlyArray<QuantumBranch>;
  canon: InstituteCanon;
  truthSignatures: Readonly<Record<string, string>>;
  inferenceDelta?: Readonly<Record<string, unknown>>;
}>;

export type PlanetaryNodeExtended = Readonly<{
  nodeId: string;
  tick: number;
  identities: ReadonlyArray<PlanetaryIdentity>;
  substrates: ReadonlyArray<PlanetarySubstrate>;
  quantumBranches: ReadonlyArray<QuantumBranch>;
  canon: InstituteCanon;
  truthSignatures: Readonly<Record<string, string>>;
  inferenceDelta: Readonly<Record<string, unknown>>;
}>;

export type PlanetaryDelta = Readonly<{
  nodeId: string;
  tick: number;
  simDelta: Readonly<{
    identities: ReadonlyArray<PlanetaryIdentity>;
    substrates: ReadonlyArray<PlanetarySubstrate>;
  }>;
  inferenceDelta: Readonly<Record<string, unknown>>;
  quantumDelta: Readonly<{ branches: ReadonlyArray<QuantumBranch> }>;
  instituteDelta: Readonly<{
    canon: InstituteCanon;
    truthSignatures: Readonly<Record<string, string>>;
  }>;
}>;

export type PlanetarySyncPacket = Readonly<{
  deltas: ReadonlyArray<PlanetaryDelta>;
  globalTick: number;
  signature: string;
}>;

export type PlanetarySynchronizationExtended = Readonly<{
  at: number;
  coordinatorIdentity: string;
  nodes: ReadonlyArray<PlanetaryNodeSnapshot>;
  governance: PlanetaryGovernanceContext;
  collapsePolicy: PlanetaryQuantumStateExtended["collapsePolicy"];
}>;

export type PlanetaryStateExtended = Readonly<{
  globalTick: number;
  nodes: Readonly<Record<string, PlanetaryNodeExtended>>;
  identities: Readonly<Record<string, PlanetaryIdentity>>;
  substrates: Readonly<Record<string, PlanetarySubstrate>>;
  substrate: PlanetarySubstrate;
  quantum: PlanetaryQuantumStateExtended;
  canon: PlanetaryCanonExtended;
  governance: PlanetaryGovernanceContext;
  coordinatorIdentity: string;
  synchronizedAt: number;
  packetSignature: string;
  advisories: ReadonlyArray<string>;
}>;

export type PlanetaryRuntimeState = PlanetaryStateExtended;

export type PlanetaryExecutionState = PlanetaryRuntimeState;
