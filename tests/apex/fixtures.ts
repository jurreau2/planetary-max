import {
  appendStructuralTruth,
  createApexGovernanceEnvelope,
  createTruthGraph,
  deriveIdentityCurvature,
  stabilizeCurvature,
  stabilizeTruth,
} from '../../src/apex/index.ts';
import type {
  ApexEnvelope,
  ApexGovernanceEnvelope,
  CurvatureState,
  GovernanceApproval,
  JsonValue,
  StabilizationReport,
  TruthGraph,
} from '../../src/apex/index.ts';

export const FENCE = 7;
export const APPROVAL: GovernanceApproval = {
  planetaryApproved: true,
  planetaryApprovalId: 'planetary-approval',
  maxOsApproved: true,
  maxOsApprovalId: 'max-os-approval',
};

export function governance(
  operations: readonly string[],
  universes: readonly string[] = ['u-a', 'u-b', 'u-c'],
  constraints: readonly string[] = ['stable-truth'],
  fence = FENCE,
): ApexGovernanceEnvelope {
  return createApexGovernanceEnvelope({
    subjectId: 'identity-1',
    approval: APPROVAL,
    allowedOperations: operations,
    allowedUniverses: universes,
    constraints,
    fence,
  });
}

export function apexEnvelope(universeId = 'u-a', sequence = 1, fence = FENCE): ApexEnvelope {
  return {
    envelopeId: `${universeId}-${sequence}`,
    universeId,
    sequence,
    fence,
    identityId: 'identity-1',
    payload: { observation: 'stable' },
    maxOsEnvelope: {
      envelopeId: `max-${universeId}-${sequence}`,
      universeId,
      sequence,
      structuralVersion: '1',
      payload: { observation: 'stable' },
      governance: APPROVAL,
    },
    governance: governance(['afa.process', 'routing.dispatch'], ['u-a', 'u-b', 'u-c'], [], fence),
  };
}

export function stableTruth(): { readonly graph: TruthGraph; readonly report: StabilizationReport } {
  const graph = appendStructuralTruth(createTruthGraph(), {
    universeId: 'u-a',
    key: 'law.gravity',
    value: { constant: 1 as JsonValue },
  });
  return { graph, report: stabilizeTruth(graph) };
}

export function stableCurvature(
  sessionId = 'session-a',
  fence = FENCE,
  universeId = 'u-a',
  identityId = 'identity-1',
): CurvatureState {
  return stabilizeCurvature(deriveIdentityCurvature(identityId, universeId), sessionId, fence);
}
