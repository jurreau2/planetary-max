import { canonicalString, compareText, deepFreeze, requireFence, requireNonEmpty, stableHash } from '../canonical.ts';
import { assertApexAuthorized } from '../governance/apex_governance.ts';
import type { ApexEnvelope, JsonValue, MaxOsEnvelope } from '../types.ts';

export type AfaBackHalfResult = {
  readonly envelopes: readonly ApexEnvelope[];
  readonly digest: string;
};

function validateMaxOsEnvelope(envelope: MaxOsEnvelope): void {
  requireNonEmpty(envelope.envelopeId, 'MAX-OS envelopeId');
  requireNonEmpty(envelope.universeId, 'MAX-OS universeId');
  requireNonEmpty(envelope.structuralVersion, 'MAX-OS structuralVersion');
  if (!Number.isSafeInteger(envelope.sequence) || envelope.sequence < 0) {
    throw new Error('MAX-OS sequence must be a non-negative safe integer');
  }
  if (!envelope.governance.planetaryApproved || !envelope.governance.maxOsApproved) {
    throw new Error('MAX-OS envelope is missing upstream governance approval');
  }
}

function compareEnvelope(left: ApexEnvelope, right: ApexEnvelope): number {
  const universeOrder = compareText(left.universeId, right.universeId);
  if (universeOrder !== 0) return universeOrder;
  if (left.sequence !== right.sequence) return left.sequence - right.sequence;
  return compareText(left.envelopeId, right.envelopeId);
}

/** Executes the deterministic AFA back-half after validating MAX-OS structure and governance. */
export function runAfaBackHalf(envelopes: readonly ApexEnvelope[]): AfaBackHalfResult {
  const ordered = [...envelopes].sort(compareEnvelope);
  const seenIds = new Set<string>();
  const lastSequence = new Map<string, number>();
  for (const envelope of ordered) {
    requireNonEmpty(envelope.envelopeId, 'Apex envelopeId');
    requireNonEmpty(envelope.identityId, 'Apex identityId');
    requireFence(envelope.fence);
    if (envelope.identityId !== envelope.governance.subjectId) {
      throw new Error('AFA identity does not match governance subject');
    }
    validateMaxOsEnvelope(envelope.maxOsEnvelope);
    if (envelope.maxOsEnvelope.universeId !== envelope.universeId) {
      throw new Error('Apex and MAX-OS universe identifiers must match');
    }
    if (envelope.maxOsEnvelope.sequence !== envelope.sequence) {
      throw new Error('Apex and MAX-OS sequences must match');
    }
    if (canonicalString(envelope.maxOsEnvelope.payload) !== canonicalString(envelope.payload)) {
      throw new Error('Apex payload must preserve the MAX-OS structural payload');
    }
    if (seenIds.has(envelope.envelopeId)) throw new Error('Duplicate Apex envelope identifier');
    const previousSequence = lastSequence.get(envelope.universeId);
    if (previousSequence !== undefined && envelope.sequence <= previousSequence) {
      throw new Error('AFA sequences must increase within each universe');
    }
    assertApexAuthorized(envelope.governance, 'afa.process', envelope.universeId, envelope.fence);
    seenIds.add(envelope.envelopeId);
    lastSequence.set(envelope.universeId, envelope.sequence);
  }
  const frozen = deepFreeze(ordered);
  const digestInput: JsonValue = frozen.map((envelope) => ({
    envelopeId: envelope.envelopeId,
    universeId: envelope.universeId,
    sequence: envelope.sequence,
    fence: envelope.fence,
  }));
  return deepFreeze({ envelopes: frozen, digest: stableHash(digestInput) });
}
