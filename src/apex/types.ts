export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | { readonly [key: string]: JsonValue } | readonly JsonValue[];

export type GovernanceApproval = {
  readonly planetaryApproved: boolean;
  readonly planetaryApprovalId: string;
  readonly maxOsApproved: boolean;
  readonly maxOsApprovalId: string;
};

export type MaxOsEnvelope<T extends JsonValue = JsonValue> = {
  readonly envelopeId: string;
  readonly universeId: string;
  readonly sequence: number;
  readonly structuralVersion: string;
  readonly payload: T;
  readonly governance: GovernanceApproval;
};

export type ApexGovernanceEnvelope = {
  readonly envelopeId: string;
  readonly subjectId: string;
  readonly planetaryApproved: true;
  readonly planetaryApprovalId: string;
  readonly maxOsApproved: true;
  readonly maxOsApprovalId: string;
  readonly allowedOperations: readonly string[];
  readonly allowedUniverses: readonly string[];
  readonly constraints: readonly string[];
  readonly fence: number;
};

export type ApexEnvelope<T extends JsonValue = JsonValue> = {
  readonly envelopeId: string;
  readonly universeId: string;
  readonly sequence: number;
  readonly fence: number;
  readonly identityId: string;
  readonly payload: T;
  readonly maxOsEnvelope: MaxOsEnvelope;
  readonly governance: ApexGovernanceEnvelope;
};

export type TruthNode = {
  readonly nodeId: string;
  readonly universeId: string;
  readonly key: string;
  readonly value: JsonValue;
  readonly parentIds: readonly string[];
  readonly digest: string;
};

export type TruthGraph = {
  readonly version: number;
  readonly nodes: readonly TruthNode[];
  readonly digest: string;
};

export type CurvatureModel = {
  readonly identityId: string;
  readonly universeId: string;
  readonly components: readonly [number, number, number];
  readonly fingerprint: string;
};

export type CurvatureState = {
  readonly model: CurvatureModel;
  readonly sessionId: string;
  readonly fence: number;
  readonly stable: boolean;
};

export type StabilizationReport = {
  readonly stable: boolean;
  readonly graphVersion: number;
  readonly digest: string;
  readonly issues: readonly string[];
};

export type UniverseRoute = {
  readonly routeId: string;
  readonly sourceUniverse: string;
  readonly targetUniverse: string;
  readonly lane: string;
  readonly sequence: number;
  readonly fence: number;
};

export type IdentityPropagation = {
  readonly propagationId: string;
  readonly identityId: string;
  readonly sourceUniverse: string;
  readonly targetUniverse: string;
  readonly curvatureFingerprint: string;
  readonly fence: number;
};

export type AttractionEnvelope = {
  readonly envelopeId: string;
  readonly algorithmId: string;
  readonly sourceUniverse: string;
  readonly candidateUniverses: readonly string[];
  readonly truthDigest: string;
  readonly curvatureFingerprint: string;
  readonly fence: number;
  readonly governance: ApexGovernanceEnvelope;
};

export type InterstateRoute = {
  readonly routeId: string;
  readonly attractionEnvelopeId: string;
  readonly sourceUniverse: string;
  readonly targetUniverse: string;
  readonly score: number;
  readonly fence: number;
};
