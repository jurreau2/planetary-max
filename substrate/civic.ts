import type { GlobalState } from './planetary_state';

export type CivicCouncil = { id: string; region: string; members: string[]; approval: number; authority: number };
export type CivicPolicy = { id: string; kind: 'resource boost' | 'stability program' | 'production priority' | 'umbrella compliance'; active: boolean; effect: number };
export type ResourceAllocation = { region: string; food: number; water: number; minerals: number; energy: number };
export type CivicState = { councils: CivicCouncil[]; policies: CivicPolicy[]; resourceAllocations: ResourceAllocation[]; stability: number };

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export function createCivicState(): CivicState {
  return {
    councils: [{ id: 'core-council', region: 'core', members: [], approval: 0.75, authority: 0.7 }],
    policies: [
      { id: 'resource-boost', kind: 'resource boost', active: true, effect: 100 },
      { id: 'stability-program', kind: 'stability program', active: true, effect: 0.05 },
      { id: 'umbrella-compliance', kind: 'umbrella compliance', active: true, effect: 0.05 },
    ],
    resourceAllocations: [],
    stability: 1,
  };
}

export function applyCivicGovernance(current: GlobalState): GlobalState {
  const civic = current.civic ?? createCivicState();
  const people = current.people?.people ?? [];
  const factions = current.people?.factions ?? [];
  const leaders = people.filter(person => person.role === 'leader').sort((a, b) => b.influence - a.influence);
  const highInfluence = people.filter(person => person.influence >= 0.5).sort((a, b) => b.influence - a.influence);
  const factionIds = factions.map(faction => faction.id);
  const members = [...new Set([...factionIds, ...leaders.slice(0, 2).map(leader => leader.id), ...highInfluence.slice(0, 3).map(person => person.id)])];
  const councils = civic.councils.length ? civic.councils.map(council => ({ ...council, members })) : createCivicState().councils.map(council => ({ ...council, members }));
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const approval = average(councils.map(council => council.approval));
  const support = average(factions.map(faction => faction.support));
  const mood = average(people.map(person => person.mood));
  const stability = clamp((approval + support + mood) / 3);
  const umbrellaEnabled = current.umbrella?.mode === 'enabled';
  const policies = civic.policies.map(policy => ({ ...policy, active: umbrellaEnabled || policy.kind !== 'umbrella compliance' }));
  const allocations = Object.keys(current.regions).map(region => ({
    region,
    food: policies.some(policy => policy.active && policy.kind === 'resource boost') ? 100 : 0,
    water: policies.some(policy => policy.active && policy.kind === 'resource boost') ? 100 : 0,
    minerals: 0,
    energy: umbrellaEnabled ? 25 : 0,
  }));
  return { ...current, civic: { councils, policies, resourceAllocations: allocations, stability } };
}
