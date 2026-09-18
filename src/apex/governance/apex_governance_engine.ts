import { deepFreeze, sortedUnique, stableHash } from '../canonical.ts';
import type { ApexGovernanceEnvelope, JsonValue } from '../types.ts';

export type ApexGovernanceDecision = {
  readonly decisionId: string;
  readonly authorized: boolean;
  readonly reasons: readonly string[];
};

export type ApexGovernanceRequest = {
  readonly envelope: ApexGovernanceEnvelope;
  readonly operation: string;
  readonly universes: readonly string[];
  readonly expectedFence: number;
  readonly requiredConstraints?: readonly string[];
};

/** Evaluates Apex, planetary, and MAX-OS constraints as a deterministic pure decision. */
export function evaluateApexGovernance(request: ApexGovernanceRequest): ApexGovernanceDecision {
  const reasons: string[] = [];
  const universes = sortedUnique(request.universes);
  const validFence = Number.isSafeInteger(request.expectedFence) && request.expectedFence >= 0;
  if (!request.envelope.planetaryApproved) reasons.push('Planetary governance approval is required');
  if (!request.envelope.maxOsApproved) reasons.push('MAX-OS governance approval is required');
  if (!validFence) reasons.push('Expected governance fence must be a non-negative safe integer');
  if (request.envelope.fence !== request.expectedFence) reasons.push('Governance fence mismatch');
  if (request.operation.trim().length === 0) reasons.push('Governance operation must not be empty');
  if (!request.envelope.allowedOperations.includes(request.operation)) reasons.push('Operation is outside the Apex grant');
  if (universes.length === 0) reasons.push('Governance requires at least one universe');
  for (const universe of universes) {
    if (!request.envelope.allowedUniverses.includes(universe)) reasons.push(`Universe is outside the Apex grant: ${universe}`);
  }
  for (const constraint of sortedUnique(request.requiredConstraints ?? [])) {
    if (!request.envelope.constraints.includes(constraint)) reasons.push(`Required Apex constraint is missing: ${constraint}`);
  }
  const normalizedReasons = sortedUnique(reasons);
  const identity: JsonValue = {
    envelopeId: request.envelope.envelopeId,
    operation: request.operation,
    universes,
    expectedFence: validFence ? request.expectedFence : `invalid:${String(request.expectedFence)}`,
    reasons: normalizedReasons,
  };
  return deepFreeze({
    decisionId: `apex-decision-${stableHash(identity)}`,
    authorized: normalizedReasons.length === 0,
    reasons: normalizedReasons,
  });
}

export function enforceApexGovernance(request: ApexGovernanceRequest): ApexGovernanceDecision {
  const decision = evaluateApexGovernance(request);
  if (!decision.authorized) throw new Error(`Apex governance rejected operation: ${decision.reasons.join('; ')}`);
  return decision;
}
