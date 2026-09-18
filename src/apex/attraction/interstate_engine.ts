import { deepFreeze, requireFence, stableHash } from '../canonical.ts';
import { attractAlgorithm } from './algorithm_attraction.ts';
import { assertTruthStable } from '../stabilization/truth_stabilizer.ts';
import type { AttractionEnvelope, CurvatureState, InterstateRoute, JsonValue, StabilizationReport, TruthGraph } from '../types.ts';

/** Converts deterministic attraction decisions into fenced interstate routes. */
export function buildInterstateRoutes(
  envelope: AttractionEnvelope,
  truthGraph: TruthGraph,
  truthReport: StabilizationReport,
  curvature: CurvatureState,
  expectedFence: number,
): readonly InterstateRoute[] {
  assertTruthStable(truthGraph, truthReport);
  requireFence(expectedFence, 'expectedFence');
  if (envelope.fence !== expectedFence) throw new Error('Interstate attraction fence mismatch');
  const decisions = attractAlgorithm(envelope, truthGraph, truthReport, curvature, expectedFence);
  return deepFreeze(decisions.map((decision) => {
    const identity: JsonValue = {
      attractionEnvelopeId: envelope.envelopeId,
      sourceUniverse: envelope.sourceUniverse,
      targetUniverse: decision.targetUniverse,
      score: decision.score,
      fence: expectedFence,
    };
    return deepFreeze({
      routeId: `interstate-${stableHash(identity)}`,
      attractionEnvelopeId: envelope.envelopeId,
      sourceUniverse: envelope.sourceUniverse,
      targetUniverse: decision.targetUniverse,
      score: decision.score,
      fence: expectedFence,
    });
  }));
}
