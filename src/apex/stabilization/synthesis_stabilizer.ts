import { assertCurvatureStable } from './curvature_stabilizer.ts';
import { assertTruthStable } from './truth_stabilizer.ts';
import { synthesizeAcrossUniverses } from '../synthesis/cross_universe.ts';
import type { SynthesisLane, CrossUniverseSynthesis } from '../synthesis/cross_universe.ts';
import type { ApexGovernanceEnvelope, CurvatureState, StabilizationReport, TruthGraph } from '../types.ts';

/** Permits synthesis only after truth and every participating curvature state stabilize. */
export function stabilizeSynthesis(
  lanes: readonly SynthesisLane[],
  governance: ApexGovernanceEnvelope,
  truthGraph: TruthGraph,
  truthReport: StabilizationReport,
  curvatureStates: readonly CurvatureState[],
  expectedFence: number,
): CrossUniverseSynthesis {
  assertTruthStable(truthGraph, truthReport);
  if (curvatureStates.length === 0) throw new Error('Synthesis requires stabilized identity curvature');
  const stableUniverses = new Set<string>();
  for (const state of curvatureStates) {
    assertCurvatureStable(state, expectedFence);
    if (state.model.identityId !== governance.subjectId) {
      throw new Error('Synthesis curvature identity does not match governance subject');
    }
    stableUniverses.add(state.model.universeId);
  }
  const participatingUniverses = new Set(lanes.flatMap((lane) => [lane.sourceUniverse, lane.targetUniverse]));
  for (const universeId of participatingUniverses) {
    if (!stableUniverses.has(universeId)) {
      throw new Error(`Synthesis requires stabilized curvature for universe: ${universeId}`);
    }
  }
  return synthesizeAcrossUniverses(lanes, governance, expectedFence);
}
