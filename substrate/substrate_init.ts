import { createPlanetaryState, type PlanetaryState } from './planetary_state';
import { createSnapshot, type Snapshot } from './snapshot';
import { synthesize, type Synthesis } from './synthesis';

export type Substrate = { state: PlanetaryState; snapshot: Snapshot; synthesis: Synthesis };
export function initializeSubstrate(): Substrate { const state = createPlanetaryState(); return { state, snapshot: createSnapshot(state), synthesis: synthesize(state) }; }
export function refreshSubstrate(state: PlanetaryState): Substrate { return { state, snapshot: createSnapshot(state), synthesis: synthesize(state) }; }
