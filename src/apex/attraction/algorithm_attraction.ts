import { compareText, deepFreeze, requireFence, stableHash } from '../canonical.ts';
import { enforceApexGovernance } from '../governance/apex_governance_engine.ts';
import { assertCurvatureStable } from '../stabilization/curvature_stabilizer.ts';
import { assertTruthStable } from '../stabilization/truth_stabilizer.ts';
import type { AttractionEnvelope, CurvatureState, JsonValue, StabilizationReport, TruthGraph } from '../types.ts';

export type AttractionDecision = {
  readonly targetUniverse: string;
  readonly score: number;
};

function deterministicScore(envelope: AttractionEnvelope, targetUniverse: string): number {
  const identity: JsonValue = {
    algorithmId: envelope.algorithmId,
    sourceUniverse: envelope.sourceUniverse,
    targetUniverse,
    truthDigest: envelope.truthDigest,
    curvatureFingerprint: envelope.curvatureFingerprint,
  };
  const numerator = Number(BigInt(`0x${stableHash(identity)}`) >> 11n);
  return Number((numerator / 0x1fffffffffffff).toFixed(12));
}

/** Ranks explicitly supplied universes using only stable envelope inputs. */
export function attractAlgorithm(
  envelope: AttractionEnvelope,
  truthGraph: TruthGraph,
  truthReport: StabilizationReport,
  curvature: CurvatureState,
  expectedFence: number,
): readonly AttractionDecision[] {
  assertTruthStable(truthGraph, truthReport);
  assertCurvatureStable(curvature, expectedFence);
  requireFence(expectedFence, 'expectedFence');
  if (envelope.fence !== expectedFence) throw new Error('Attraction fence mismatch');
  if (envelope.truthDigest !== truthReport.digest) throw new Error('Attraction truth digest mismatch');
  if (envelope.curvatureFingerprint !== curvature.model.fingerprint) {
    throw new Error('Attraction curvature fingerprint mismatch');
  }
  if (curvature.model.identityId !== envelope.governance.subjectId) {
    throw new Error('Attraction curvature identity does not match governance subject');
  }
  if (curvature.model.universeId !== envelope.sourceUniverse) {
    throw new Error('Attraction curvature source universe mismatch');
  }
  if (envelope.candidateUniverses.length === 0) throw new Error('Attraction requires explicit universe candidates');
  const candidates = [...new Set(envelope.candidateUniverses)].sort(compareText);
  if (candidates.includes(envelope.sourceUniverse)) {
    throw new Error('Interstate attraction candidates must be other universes');
  }
  enforceApexGovernance({
    envelope: envelope.governance,
    operation: 'attraction.execute',
    universes: [envelope.sourceUniverse, ...candidates],
    expectedFence,
    requiredConstraints: ['stable-truth'],
  });
  return deepFreeze(candidates
    .map((targetUniverse) => deepFreeze({ targetUniverse, score: deterministicScore(envelope, targetUniverse) }))
    .sort((left, right) => right.score - left.score || compareText(left.targetUniverse, right.targetUniverse)));
}
