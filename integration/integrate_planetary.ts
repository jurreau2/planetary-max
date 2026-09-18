import type { PlanetaryState } from '../substrate/planetary_state';
import { governedSynthesis } from '../governance/apex_init';
export function bindPlanetaryToApex(state: PlanetaryState) { return governedSynthesis(state, 0); }
