import type { GlobalState } from './planetary_state';
import type { Person, PeopleFaction } from './planetary_state';

export type RegionHistory = {
  id: string;
  origin: string;
  culture: { values: string[]; customs: string[]; symbols: string[]; languageMarkers: string[] };
  geography: { terrainDifficulty: number; biomes: string[]; geologicalEvents: string[] };
  notableEvents: string[];
};

export type NPCBiography = {
  personId: string;
  birthplace: string;
  family: string[];
  education: string;
  factionAlignment: string;
  lifeEvents: string[];
};

export type FactionOrigin = {
  factionId: string;
  foundingDate: string;
  founders: string[];
  ideology: string;
  earlyConflicts: string[];
  culturalImpact: string[];
};

export type EnvironmentalLore = {
  climatePatterns: string[];
  resourceMyths: string[];
  historicalDisasters: string[];
};

export type QuantumAnomalySeed = {
  id: string;
  tick: number;
  coherenceDip: number;
  basisShift: number[];
  signature: string;
  storySeed: string;
};

export type WorldState = {
  regions: Record<string, RegionHistory>;
  biographies: Record<string, NPCBiography>;
  factionOrigins: Record<string, FactionOrigin>;
  environmentalLore: EnvironmentalLore;
  quantumAnomalies: QuantumAnomalySeed[];
  narrative: string[];
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export function createWorldState(): WorldState {
  return {
    regions: {},
    biographies: {},
    factionOrigins: {},
    environmentalLore: { climatePatterns: [], resourceMyths: [], historicalDisasters: [] },
    quantumAnomalies: [],
    narrative: [],
  };
}

export function evolveWorld(current: GlobalState, quantum: { coherence: number; basis: number[]; hash: string }, kernel: { physics: { gravity: number; temperature: number; collisions: number } }): WorldState {
  const previous = current.world ?? createWorldState();
  const regions = { ...previous.regions };
  for (const [id, region] of Object.entries(current.regions)) {
    const history = regions[id] ?? {
      id,
      origin: `Founded during planetary cycle ${current.tick}`,
      culture: { values: ['survival', 'cooperation'], customs: ['seasonal resource sharing'], symbols: [`${id}-sigil`], languageMarkers: [`${id}-common`] },
      geography: { terrainDifficulty: 0, biomes: [], geologicalEvents: [] },
      notableEvents: [],
    };
    const terrainDifficulty = clamp(Math.abs(kernel.physics.gravity - 9.81) / 9.81);
    const biome = kernel.physics.temperature < 0 ? 'frozen' : kernel.physics.temperature > 35 ? 'arid' : 'temperate';
    const geologicalEvents = kernel.physics.collisions > 0 ? [...history.geography.geologicalEvents, `Collision event at tick ${current.tick}`].slice(-20) : history.geography.geologicalEvents;
    regions[id] = { ...history, geography: { terrainDifficulty, biomes: [...new Set([...history.geography.biomes, biome])], geologicalEvents } };
  }

  const biographies = { ...previous.biographies };
  for (const person of current.people?.people ?? []) {
    const existing = biographies[person.id];
    biographies[person.id] = existing ?? {
      personId: person.id,
      birthplace: 'Core region',
      family: [],
      education: person.job === 'research' ? 'Research academy' : 'Civic commons',
      factionAlignment: person.faction,
      lifeEvents: [`Entered the planetary record at tick ${current.tick}`],
    };
  }

  const factionOrigins = { ...previous.factionOrigins };
  for (const faction of current.people?.factions ?? []) {
    const existing = factionOrigins[faction.id];
    factionOrigins[faction.id] = existing ?? {
      factionId: faction.id,
      foundingDate: current.updatedAt,
      founders: [],
      ideology: faction.name,
      earlyConflicts: [],
      culturalImpact: ['Shaped early civic identity'],
    };
  }

  const environmentalLore = {
    climatePatterns: [...new Set([...previous.environmentalLore.climatePatterns, kernel.physics.temperature < 0 ? 'Persistent cold cycle' : kernel.physics.temperature > 35 ? 'Heat cycle' : 'Temperate cycle'])],
    resourceMyths: [...new Set([...previous.environmentalLore.resourceMyths, 'The first mineral seam beneath the Core'])],
    historicalDisasters: kernel.physics.collisions > 0 ? [...previous.environmentalLore.historicalDisasters, `Geological disruption at tick ${current.tick}`].slice(-20) : previous.environmentalLore.historicalDisasters,
  };

  const quantumAnomalies = quantum.coherence < 0.5 ? [...previous.quantumAnomalies, { id: `anomaly-${current.tick}`, tick: current.tick, coherenceDip: 1 - quantum.coherence, basisShift: quantum.basis, signature: quantum.hash, storySeed: `A coherence dip changed the memory of the world at tick ${current.tick}.` }].slice(-50) : previous.quantumAnomalies;
  const narrative = [...previous.narrative, ...current.events.map(event => event.includes('Unrest') ? `Political arc: ${event}` : event.includes('scarcity') ? `Economic arc: ${event}` : event.includes('Quantum') ? `Quantum arc: ${event}` : `World record: ${event}`)].slice(-100);
  return { regions, biographies, factionOrigins, environmentalLore, quantumAnomalies, narrative };
}
