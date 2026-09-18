import type { PlanetaryState } from '../substrate/planetary_state';
import { stabilizeCurvature } from '../governance/curvature';
export function bindApexToPlanetary(state: PlanetaryState) { const stability = Object.values(state.regions).reduce((a, r) => a + r.stability, 0) / Math.max(1, Object.keys(state.regions).length); return stabilizeCurvature(1 - stability); }
