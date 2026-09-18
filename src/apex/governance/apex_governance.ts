import { deepFreeze, requireFence, requireNonEmpty, sortedUnique, stableHash } from '../canonical.ts';
import type { ApexGovernanceEnvelope, GovernanceApproval, JsonValue } from '../types.ts';

export type ApexGovernanceInput = {
  readonly subjectId: string;
  readonly approval: GovernanceApproval;
  readonly allowedOperations: readonly string[];
  readonly allowedUniverses: readonly string[];
  readonly constraints?: readonly string[];
  readonly fence: number;
};

/** Creates an Apex grant only when planetary and MAX-OS governance both approve it. */
export function createApexGovernanceEnvelope(input: ApexGovernanceInput): ApexGovernanceEnvelope {
  requireNonEmpty(input.subjectId, 'subjectId');
  requireFence(input.fence);
  if (!input.approval.planetaryApproved || !input.approval.maxOsApproved) {
    throw new Error('Apex governance requires planetary and MAX-OS approval');
  }
  requireNonEmpty(input.approval.planetaryApprovalId, 'planetaryApprovalId');
  requireNonEmpty(input.approval.maxOsApprovalId, 'maxOsApprovalId');
  const allowedOperations = sortedUnique(input.allowedOperations);
  const allowedUniverses = sortedUnique(input.allowedUniverses);
  if (allowedOperations.length === 0 || allowedUniverses.length === 0) {
    throw new Error('Apex governance must authorize at least one operation and universe');
  }
  const constraints = sortedUnique(input.constraints ?? []);
  const identity: JsonValue = {
    subjectId: input.subjectId,
    planetaryApprovalId: input.approval.planetaryApprovalId,
    maxOsApprovalId: input.approval.maxOsApprovalId,
    allowedOperations,
    allowedUniverses,
    constraints,
    fence: input.fence,
  };
  return deepFreeze({
    envelopeId: `apex-governance-${stableHash(identity)}`,
    subjectId: input.subjectId,
    planetaryApproved: true,
    planetaryApprovalId: input.approval.planetaryApprovalId,
    maxOsApproved: true,
    maxOsApprovalId: input.approval.maxOsApprovalId,
    allowedOperations,
    allowedUniverses,
    constraints,
    fence: input.fence,
  });
}

/** Rejects stale fences and any operation or universe outside the upstream grant. */
export function assertApexAuthorized(
  envelope: ApexGovernanceEnvelope,
  operation: string,
  universeId: string,
  expectedFence: number,
): void {
  requireFence(expectedFence, 'expectedFence');
  if (!envelope.planetaryApproved || !envelope.maxOsApproved) {
    throw new Error('Apex governance cannot bypass planetary or MAX-OS governance');
  }
  if (envelope.fence !== expectedFence) throw new Error('Apex governance fence mismatch');
  if (!envelope.allowedOperations.includes(operation)) {
    throw new Error(`Apex operation is not authorized: ${operation}`);
  }
  if (!envelope.allowedUniverses.includes(universeId)) {
    throw new Error(`Apex universe is not authorized: ${universeId}`);
  }
  requireNonEmpty(envelope.planetaryApprovalId, 'planetaryApprovalId');
  requireNonEmpty(envelope.maxOsApprovalId, 'maxOsApprovalId');
}
