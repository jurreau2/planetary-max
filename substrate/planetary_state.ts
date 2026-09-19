export type Citizen = { id: string; mood: number; compliance: number; productivity: number; stabilitySensitivity: number };
export type Faction = { id: string; support: number; dissent: number; influence: number; umbrellaAligned: boolean };
export type Leader = { id: string; authority: number; approval: number; stabilityImpact: number };
export type NPCState = { citizens: Citizen[]; factions: Faction[]; leaders: Leader[] };

export type PlanetaryState = {
  version: number;
  tick: number;
  updatedAt: string;
  population: number;
  energy: number;
  resources: Record<string, number>;
  regions: Record<string, { population: number; stability: number; production: number }>;
  events: string[];
  npc: NPCState;
};

export type StatePatch = Partial<Pick<PlanetaryState, 'population' | 'energy' | 'resources' | 'regions' | 'events' | 'npc'>>;

export function createPlanetaryState(now = new Date().toISOString()): PlanetaryState {
  return { version: 1, tick: 0, updatedAt: now, population: 1000, energy: 10000, resources: { food: 5000, water: 5000, minerals: 2500 }, regions: { core: { population: 1000, stability: 1, production: 100 } }, events: [], npc: { citizens: [], factions: [], leaders: [] } };
}

export function applyPatch(state: PlanetaryState, patch: StatePatch, now = new Date().toISOString()): PlanetaryState {
  return { ...state, ...patch, updatedAt: now, resources: patch.resources ? { ...state.resources, ...patch.resources } : state.resources, regions: patch.regions ? { ...state.regions, ...patch.regions } : state.regions, npc: patch.npc ? { ...state.npc, ...patch.npc } : state.npc };
}

export function validateState(state: PlanetaryState): string[] {
  const errors: string[] = [];
  if (state.population < 0 || state.energy < 0) errors.push('population and energy must be non-negative');
  for (const [key, value] of Object.entries(state.resources)) if (value < 0) errors.push(`resource ${key} must be non-negative`);
  return errors;
}
