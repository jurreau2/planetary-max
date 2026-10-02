import type { PlanetaryState } from "./types";

/**
 * Phase‑19 Inference Model
 *
 * The inference lane no longer uses:
 * - InferenceFact
 * - InferenceHypothesis
 * - InferenceRecommendation
 * - PortalKernelState
 * - kind / facts / node / probability / curvature / signature
 *
 * The canonical Phase‑19 inference output is a flat autonomy‑like structure:
 * {
 *   mode: "inference",
 *   stable: boolean,
 *   score: number,
 *   preserved: boolean
 * }
 */

export function evaluateInference(state: PlanetaryState) {
  const node = state.nodes.at(-1);

  // Phase‑19 inference is intentionally minimal:
  // it reports stability + preservation based on node substrate/canon presence.
  const hasSubstrate = !!node?.substrate;
  const hasCanon = !!node?.canon;

  return {
    mode: "inference",
    stable: hasSubstrate && hasCanon,
    score: hasSubstrate && hasCanon ? 1 : 0,
    preserved: hasCanon,
  };
}

export default {
  evaluateInference,
};
