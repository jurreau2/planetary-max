import type { CivicState, CivicCouncil } from './civic';
import type { EcosystemState } from './ecosystem';
import type { PeopleState, Person, PeopleFaction } from './planetary_state';

export type InteractionChannel = 'social' | 'political' | 'economic' | 'environmental' | 'quantum';
export type InteractionRecord = { id: string; channel: InteractionChannel; from: string; to: string; effect: string; strength: number; tick: number };
export type InteractionState = { channels: InteractionChannel[]; records: InteractionRecord[]; relationships: Record<string, number>; crossRegion: InteractionRecord[]; crossPlanet: InteractionRecord[] };

type InteractiveState = {
  tick: number;
  updatedAt: string;
  umbrella?: { mode: 'enabled' | 'disabled' };
  people?: PeopleState;
  civic?: CivicState;
  ecosystem?: EcosystemState;
  interactions?: InteractionState;
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function createInteractionState(): InteractionState {
  return { channels: ['social', 'political', 'economic', 'environmental', 'quantum'], records: [], relationships: {}, crossRegion: [], crossPlanet: [] };
}

function socialInteractions(people: Person[], tick: number): { people: Person[]; records: InteractionRecord[]; relationships: Record<string, number> } {
  const records: InteractionRecord[] = [];
  const relationships: Record<string, number> = {};
  const next = people.map(person => ({ ...person }));
  for (let index = 0; index + 1 < next.length; index += 2) {
    const left = next[index];
    const right = next[index + 1];
    const moodDelta = (right.mood - left.mood) * 0.05;
    const influence = clamp((left.influence + right.influence) / 2);
    left.mood = clamp(left.mood + moodDelta);
    right.mood = clamp(right.mood - moodDelta);
    left.influence = clamp(left.influence + right.influence * 0.01);
    right.influence = clamp(right.influence + left.influence * 0.01);
    const key = [left.id, right.id].sort().join(':');
    relationships[key] = clamp((relationships[key] ?? 0) + 0.05 + influence * 0.02, -1, 1);
    records.push({ id: `social-${tick}-${index}`, channel: 'social', from: left.id, to: right.id, effect: 'mood and influence exchange', strength: influence, tick });
  }
  return { people: next, records, relationships };
}

export function applyInteractions<T extends InteractiveState>(current: T): T {
  const previous = current.interactions ?? createInteractionState();
  const people = current.people?.people ?? [];
  const factions = current.people?.factions ?? [];
  const umbrellaEnabled = current.umbrella?.mode === 'enabled';
  const social = socialInteractions(people, current.tick);
  const records = [...social.records];

  const factionMap = new Map(factions.map(faction => [faction.id, { ...faction }]));
  const governedPeople = social.people.map(person => {
    const faction = factionMap.get(person.faction);
    const next = { ...person };
    if (umbrellaEnabled) { next.compliance = clamp(next.compliance + 0.03); next.mood = clamp(next.mood + 0.01); }
    else { next.compliance = clamp(next.compliance - 0.02); next.mood = clamp(next.mood - 0.02); }
    const factionShift = next.compliance < 0.4 ? 0.03 : -0.01;
    if (faction) { faction.dissent = clamp(faction.dissent + factionShift); faction.support = clamp(faction.support - factionShift); faction.influence = clamp(faction.influence + next.influence * 0.01); records.push({ id: `faction-${current.tick}-${next.id}`, channel: 'political', from: next.id, to: faction.id, effect: 'support and dissent shift', strength: Math.abs(factionShift), tick: current.tick }); }
    return next;
  });

  const councils = current.civic?.councils.map((council: CivicCouncil) => {
    const represented = governedPeople.filter(person => council.members.includes(person.id));
    const approvalDelta = (average(represented.map(person => person.mood)) - council.approval) * 0.05;
    records.push({ id: `council-${current.tick}-${council.id}`, channel: 'political', from: 'people', to: council.id, effect: 'approval feedback', strength: Math.abs(approvalDelta), tick: current.tick });
    return { ...council, approval: clamp(council.approval + approvalDelta), authority: clamp(council.authority + (umbrellaEnabled ? 0.01 : -0.01)) };
  });

  const crossRegion = Object.keys(current.ecosystem?.regions ?? {}).length > 1 ? [{ id: `regions-${current.tick}`, channel: 'economic' as const, from: 'regions', to: 'regions', effect: 'trade, migration, and cultural exchange', strength: 0.1, tick: current.tick }] : [];
  const crossPlanet = (current.ecosystem?.planets ?? []).slice(0, 2).map((planet, index) => ({ id: `planets-${current.tick}-${index}`, channel: 'quantum' as const, from: 'terra', to: planet.id, effect: 'shared events, anomalies, and governance signals', strength: 0.1, tick: current.tick }));
  const nextFactions = [...factionMap.values()];
  const nextPeople: PeopleState = current.people ? { ...current.people, people: governedPeople, factions: nextFactions, influence: [...current.people.influence, ...social.records.map(record => ({ from: record.from, to: record.to, weight: record.strength, kind: 'person' as const }))].slice(-500) } : { people: governedPeople, factions: nextFactions, influence: [] };
  const nextInteractions: InteractionState = { channels: previous.channels, records: [...previous.records, ...records].slice(-500), relationships: { ...previous.relationships, ...social.relationships }, crossRegion: [...previous.crossRegion, ...crossRegion].slice(-100), crossPlanet: [...previous.crossPlanet, ...crossPlanet].slice(-100) };
  return { ...current, people: nextPeople, civic: current.civic ? { ...current.civic, councils } : current.civic, interactions: nextInteractions } as T;
}
