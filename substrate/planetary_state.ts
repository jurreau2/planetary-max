import type { AutonomyFeedbackState } from './autonomy_feedback';

export type PeopleRole = 'worker' | 'leader' | 'citizen' | 'specialist' | 'enforcer';
export type PeopleJob = 'production' | 'governance' | 'research' | 'logistics' | 'security';
export type Person = { id: string; age: number; role: PeopleRole; job: PeopleJob; faction: string; mood: number; compliance: number; productivity: number; influence: number };
export type PeopleFaction = { id: string; name: string; ideology: string; support: number; dissent: number; influence: number };
export type InfluenceEdge = { from: string; to: string; weight: number; kind: 'person' | 'faction' | 'leader' };
export type PeopleState = { people: Person[]; factions: PeopleFaction[]; influence: InfluenceEdge[] };
export type Citizen = Person;
export type Faction = PeopleFaction & { umbrellaAligned: boolean };
export type Leader = Person & { authority: number; approval: number; stabilityImpact: number };
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
  people: PeopleState;
  autonomyFeedback: AutonomyFeedbackState;
};

export type StatePatch = Partial<Pick<PlanetaryState, 'population' | 'energy' | 'resources' | 'regions' | 'events' | 'npc' | 'people' | 'autonomyFeedback'>>;

export function createPlanetaryState(now = new Date().toISOString()): PlanetaryState {
  return {
    version: 1,
    tick: 0,
    updatedAt: now,
    population: 1000,
    energy: 10000,
    resources: { food: 5000, water: 5000, minerals: 2500 },
    regions: { core: { population: 1000, stability: 1, production: 100 } },
    events: [],
    npc: { citizens: [], factions: [], leaders: [] },
    people: { people: [], factions: [], influence: [] },
    autonomyFeedback: { tick: 0, logs: [], goalsHistory: [] },
  };
}

export function applyPatch(state: PlanetaryState, patch: StatePatch, now = new Date().toISOString()): PlanetaryState {
  return {
    ...state,
    ...patch,
    updatedAt: now,
    resources: patch.resources ? { ...state.resources, ...patch.resources } : state.resources,
    regions: patch.regions ? { ...state.regions, ...patch.regions } : state.regions,
    npc: patch.npc ? { ...state.npc, ...patch.npc } : state.npc,
    people: patch.people ? { ...state.people, ...patch.people } : state.people,
    autonomyFeedback: patch.autonomyFeedback ? { ...state.autonomyFeedback, ...patch.autonomyFeedback } : state.autonomyFeedback,
  };
}

export function validateState(state: PlanetaryState): string[] {
  const errors: string[] = [];
  if (state.population < 0 || state.energy < 0) errors.push('population and energy must be non-negative');
  for (const [key, value] of Object.entries(state.resources)) if (value < 0) errors.push(`resource ${key} must be non-negative`);
  return errors;
}
