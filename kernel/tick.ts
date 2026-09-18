import { applyPatch, type PlanetaryState } from '../substrate/planetary_state';
import { physicsStep, type Physics } from './physics';
import { economyStep, type Economy } from './economics';
export type TickResult = { state: PlanetaryState; physics: Physics; economy: Economy; events: string[] };
export function tick(state: PlanetaryState, physics: Physics = { gravity: 9.81, temperature: 20, collisions: 0 }, economy: Economy = { gdp: 1000, inflation: 0.02, production: 0 }): TickResult { const events = [`tick ${state.tick + 1} completed`]; const next = applyPatch(state, { tick: state.tick + 1, energy: Math.max(0, state.energy - state.population * 0.01), events }); return { state: next, physics: physicsStep(physics, next.population), economy: economyStep(economy, next.population, next.resources), events }; }
