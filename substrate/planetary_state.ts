export type PlanetaryState = {
  version: number;
  tick: number;
  updatedAt: string;
  population: number;
  energy: number;
  resources: Record<string, number>;
  regions: Record<string, { population: number; stability: number; production: number }>;
  events: string[];
};

export type StatePatch = Partial<Pick<PlanetaryState, 'population' | 'energy' | 'resources' | 'regions' | 'events'>>;

export function createPlanetaryState(now = new Date().toISOString()): PlanetaryState {
  return { version: 1, tick: 0, updatedAt: now, population: 1000, energy: 10000, resources: { food: 5000, water: 5000, minerals: 2500 }, regions: { core: { population: 1000, stability: 1, production: 100 } }, events: [] };
}

export function applyPatch(state: PlanetaryState, patch: StatePatch, now = new Date().toISOString()): PlanetaryState {
  return { ...state, ...patch, resources: patch.resources ? { ...state.resources, ...patch.resources } : state.resources, regions: patch.regions ? { ...state.regions, ...patch.regions } : state.regions, version: state.version + 1, updatedAt: now };
}

export function validateState(state: PlanetaryState): string[] {
  const errors: string[] = [];
  if (state.population < 0 || state.energy < 0) errors.push('population and energy must be non-negative');
  for (const [key, value] of Object.entries(state.resources)) if (value < 0) errors.push(`resource ${key} must be non-negative`);
  return errors;
}
