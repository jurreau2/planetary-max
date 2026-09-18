import { compareText, deepFreeze, requireFence, requireNonEmpty, stableHash } from '../canonical.ts';
import { assertApexAuthorized } from '../governance/apex_governance.ts';
import { assertTruthStable } from '../stabilization/truth_stabilizer.ts';
import type { ApexEnvelope, JsonValue, StabilizationReport, TruthGraph, UniverseRoute } from '../types.ts';

export type RoutedApexEnvelope = {
  readonly dispatchId: string;
  readonly route: UniverseRoute;
  readonly envelopeId: string;
};

function compareRoute(left: UniverseRoute, right: UniverseRoute): number {
  const targetOrder = compareText(left.targetUniverse, right.targetUniverse);
  if (targetOrder !== 0) return targetOrder;
  const laneOrder = compareText(left.lane, right.lane);
  return laneOrder === 0 ? compareText(left.routeId, right.routeId) : laneOrder;
}

/** Dispatches only explicit routes in a stable order after truth stabilization and governance. */
export function routeAcrossUniverses(
  envelope: ApexEnvelope,
  routes: readonly UniverseRoute[],
  truthGraph: TruthGraph,
  truthReport: StabilizationReport,
  expectedFence: number,
): readonly RoutedApexEnvelope[] {
  assertTruthStable(truthGraph, truthReport);
  requireFence(expectedFence, 'expectedFence');
  if (envelope.fence !== expectedFence) throw new Error('Apex routing fence mismatch');
  if (envelope.identityId !== envelope.governance.subjectId) {
    throw new Error('Apex routing identity does not match governance subject');
  }
  if (routes.length === 0) throw new Error('At least one explicit universe route is required');
  const ordered = [...routes].sort(compareRoute);
  const routeIds = new Set<string>();
  const dispatches = ordered.map((route) => {
    requireNonEmpty(route.routeId, 'routeId');
    requireNonEmpty(route.targetUniverse, 'targetUniverse');
    requireNonEmpty(route.lane, 'lane');
    if (route.sourceUniverse !== envelope.universeId) throw new Error('Route source does not match envelope universe');
    if (route.targetUniverse === route.sourceUniverse) throw new Error('Multi-universe routes must cross universe boundaries');
    if (route.fence !== expectedFence || route.sequence !== envelope.sequence) {
      throw new Error('Universe route sequence or fence mismatch');
    }
    if (routeIds.has(route.routeId)) throw new Error('Duplicate universe route identifier');
    assertApexAuthorized(envelope.governance, 'routing.dispatch', route.sourceUniverse, expectedFence);
    assertApexAuthorized(envelope.governance, 'routing.dispatch', route.targetUniverse, expectedFence);
    routeIds.add(route.routeId);
    const identity: JsonValue = { envelopeId: envelope.envelopeId, routeId: route.routeId };
    return deepFreeze({ dispatchId: `dispatch-${stableHash(identity)}`, route, envelopeId: envelope.envelopeId });
  });
  return deepFreeze(dispatches);
}
