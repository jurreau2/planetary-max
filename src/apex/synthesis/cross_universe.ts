import { compareText, deepFreeze, requireFence, requireNonEmpty, stableHash } from '../canonical.ts';
import { assertApexAuthorized } from '../governance/apex_governance.ts';
import type { ApexGovernanceEnvelope, JsonValue } from '../types.ts';

export type SynthesisLane = {
  readonly laneId: string;
  readonly sourceUniverse: string;
  readonly targetUniverse: string;
  readonly payload: JsonValue;
  readonly fence: number;
};

export type CrossUniverseSynthesis = {
  readonly synthesisId: string;
  readonly targetUniverse: string;
  readonly orderedLaneIds: readonly string[];
  readonly payloads: readonly JsonValue[];
  readonly fence: number;
};

function compareLane(left: SynthesisLane, right: SynthesisLane): number {
  const sourceOrder = compareText(left.sourceUniverse, right.sourceUniverse);
  return sourceOrder === 0 ? compareText(left.laneId, right.laneId) : sourceOrder;
}

/** Produces a fenced synthesis from explicitly governed lanes without mutating any universe. */
export function synthesizeAcrossUniverses(
  lanes: readonly SynthesisLane[],
  governance: ApexGovernanceEnvelope,
  expectedFence: number,
): CrossUniverseSynthesis {
  requireFence(expectedFence, 'expectedFence');
  if (lanes.length === 0) throw new Error('Cross-universe synthesis requires at least one lane');
  const ordered = [...lanes].sort(compareLane);
  const targetUniverse = ordered[0].targetUniverse;
  requireNonEmpty(targetUniverse, 'targetUniverse');
  const laneIds = new Set<string>();
  for (const lane of ordered) {
    requireNonEmpty(lane.laneId, 'laneId');
    requireNonEmpty(lane.sourceUniverse, 'sourceUniverse');
    requireFence(lane.fence);
    if (lane.fence !== expectedFence) throw new Error('Synthesis lane fence mismatch');
    if (lane.targetUniverse !== targetUniverse) throw new Error('Synthesis lanes must share one target universe');
    if (lane.sourceUniverse === lane.targetUniverse) throw new Error('Cross-universe synthesis must cross universe boundaries');
    if (laneIds.has(lane.laneId)) throw new Error('Duplicate synthesis lane identifier');
    assertApexAuthorized(governance, 'synthesis.execute', lane.sourceUniverse, expectedFence);
    laneIds.add(lane.laneId);
  }
  assertApexAuthorized(governance, 'synthesis.execute', targetUniverse, expectedFence);
  const orderedLaneIds = deepFreeze(ordered.map((lane) => lane.laneId));
  const payloads = deepFreeze(ordered.map((lane) => lane.payload));
  const identity: JsonValue = {
    targetUniverse,
    lanes: ordered.map((lane) => ({
      laneId: lane.laneId,
      sourceUniverse: lane.sourceUniverse,
      payload: lane.payload,
    })),
    fence: expectedFence,
  };
  return deepFreeze({
    synthesisId: `synthesis-${stableHash(identity)}`,
    targetUniverse,
    orderedLaneIds,
    payloads,
    fence: expectedFence,
  });
}
