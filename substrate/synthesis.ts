import type { PlanetaryState } from './planetary_state';
import { validateState } from './planetary_state';

export type Synthesis = { ok: boolean; summary: string; signals: Record<string, number>; errors: string[] };
export function synthesize(state: PlanetaryState): Synthesis {
  const errors = validateState(state);
  const totalResources = Object.values(state.resources).reduce((a, b) => a + b, 0);
  return { ok: errors.length === 0, summary: `tick ${state.tick}: ${state.population} inhabitants across ${Object.keys(state.regions).length} regions`, signals: { resourceIndex: totalResources / Math.max(state.population, 1), stability: Object.values(state.regions).reduce((a, r) => a + r.stability, 0) / Math.max(Object.keys(state.regions).length, 1), energyPerCapita: state.energy / Math.max(state.population, 1) }, errors };
}
