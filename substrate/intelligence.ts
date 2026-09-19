import type { InteractionState } from './interactions';
import type { PeopleState, Person, PeopleFaction } from './planetary_state';

export type IntelligenceAnalytics = {
  stabilityTrend: number;
  resourceTrend: number;
  populationTrend: number;
  factionTrend: number;
};

export type IntelligenceForecast = {
  population: number;
  stability: number;
  production: number;
  events: string[];
  quantumAnomalies: string[];
  confidence: number;
};

export type IntelligenceAnomaly = {
  type: 'coherence dip' | 'basis shift' | 'NPC mood collapse' | 'faction divergence';
  severity: number;
  detail: string;
};

export type IntelligenceState = {
  analytics: IntelligenceAnalytics;
  forecast: IntelligenceForecast;
  anomalies: IntelligenceAnomaly[];
  governance: { umbrellaAction: 'enable' | 'relax' | 'hold'; reason: string };
  quantum: { coherence: number; influenceScore: number; anomalyRisk: number };
  policyAdjustments: Array<'resource boost' | 'stability program' | 'production shift'>;
};

type IntelligenceInput = {
  population: number;
  energy: number;
  resources: Record<string, number>;
  regions: Record<string, { population: number; stability: number; production: number }>;
  events: string[];
  people?: PeopleState;
  interactions?: InteractionState;
  intelligence?: IntelligenceState;
  umbrella?: { mode: 'enabled' | 'disabled' };
  tick: number;
};

type QuantumInput = { coherence: number; basis: number[]; hash: string };
type KernelInput = { economy: { production: number }; physics?: { temperature?: number; collisions?: number } };

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const slope = (current: number, previous: number) => current - previous;

function detectAnomalies(input: IntelligenceInput, quantum: QuantumInput, previous?: IntelligenceState): IntelligenceAnomaly[] {
  const anomalies: IntelligenceAnomaly[] = [];
  const priorCoherence = previous?.quantum.coherence ?? quantum.coherence;
  const mood = average((input.people?.people ?? []).map(person => person.mood));
  const factionSupport = average((input.people?.factions ?? []).map(faction => faction.support));
  const factionDissent = average((input.people?.factions ?? []).map(faction => faction.dissent));
  const basisShift = average(quantum.basis.map((value, index) => Math.abs(value - (previous ? previous.quantum.coherence : 0))));
  if (quantum.coherence < 0.5 || quantum.coherence < priorCoherence - 0.1) anomalies.push({ type: 'coherence dip', severity: clamp(1 - quantum.coherence), detail: `Coherence is ${quantum.coherence.toFixed(3)} (${quantum.hash})` });
  if (basisShift > 0.25) anomalies.push({ type: 'basis shift', severity: clamp(basisShift), detail: 'Quantum basis diverged from the previous intelligence cycle' });
  if (mood < 0.3) anomalies.push({ type: 'NPC mood collapse', severity: clamp(1 - mood), detail: `Average NPC mood is ${mood.toFixed(3)}` });
  if (Math.abs(factionSupport - factionDissent) < 0.1 && input.people?.factions?.length) anomalies.push({ type: 'faction divergence', severity: clamp(1 - Math.abs(factionSupport - factionDissent)), detail: 'Faction support and dissent are converging' });
  return anomalies;
}

export function createIntelligenceState(): IntelligenceState {
  return { analytics: { stabilityTrend: 0, resourceTrend: 0, populationTrend: 0, factionTrend: 0 }, forecast: { population: 0, stability: 0, production: 0, events: [], quantumAnomalies: [], confidence: 0 }, anomalies: [], governance: { umbrellaAction: 'hold', reason: 'No stability signal yet' }, quantum: { coherence: 0, influenceScore: 0, anomalyRisk: 0 }, policyAdjustments: [] };
}

export function runIntelligence(input: IntelligenceInput, kernel: KernelInput, quantum: QuantumInput): IntelligenceState {
  const previous = input.intelligence;
  const stability = average(Object.values(input.regions).map(region => region.stability));
  const resources = Object.values(input.resources).reduce((sum, value) => sum + value, 0);
  const factionSupport = average((input.people?.factions ?? []).map(faction => faction.support));
  const currentMood = average((input.people?.people ?? []).map(person => person.mood));
  const previousPopulation = previous?.forecast.population || input.population;
  const previousStability = previous?.forecast.stability || stability;
  const previousResources = previous?.analytics.resourceTrend || resources;
  const populationTrend = slope(input.population, previousPopulation);
  const stabilityTrend = slope(stability, previousStability);
  const resourceTrend = slope(resources, previousResources);
  const factionTrend = slope(factionSupport, previous?.analytics.factionTrend || factionSupport);
  const anomalies = detectAnomalies(input, quantum, previous);
  const action = stability < 0.8 ? 'enable' : stability > 1.2 ? 'relax' : 'hold';
  const policyAdjustments: IntelligenceState['policyAdjustments'] = [];
  if (resources < 3000) policyAdjustments.push('resource boost');
  if (stability < 0.8) policyAdjustments.push('stability program');
  if (kernel.economy.production < 10) policyAdjustments.push('production shift');
  const influenceScore = average((input.people?.people ?? []).map(person => person.influence * person.productivity));
  const confidence = clamp(1 - anomalies.reduce((sum, anomaly) => sum + anomaly.severity * 0.15, 0));
  const forecastStability = clamp(stability + stabilityTrend * 2 + (input.umbrella?.mode === 'enabled' ? 0.02 : -0.02), 0, 1.5);
  const forecastPopulation = Math.max(0, Math.round(input.population + populationTrend + currentMood * 10));
  const forecastProduction = Math.max(0, kernel.economy.production + influenceScore * 10 + (forecastStability - stability) * 10);
  return {
    analytics: { stabilityTrend, resourceTrend, populationTrend, factionTrend },
    forecast: { population: forecastPopulation, stability: Number(forecastStability.toFixed(3)), production: Number(forecastProduction.toFixed(2)), events: [...input.events.slice(-5), ...anomalies.map(anomaly => `${anomaly.type}: ${anomaly.detail}`)], quantumAnomalies: anomalies.filter(anomaly => anomaly.type === 'coherence dip' || anomaly.type === 'basis shift').map(anomaly => anomaly.detail), confidence: Number(confidence.toFixed(3)) },
    anomalies,
    governance: { umbrellaAction: action, reason: stability < 0.8 ? 'Stability below adaptive governance threshold' : stability > 1.2 ? 'Stability permits relaxed enforcement' : 'Stability within operating range' },
    quantum: { coherence: quantum.coherence, influenceScore: Number(influenceScore.toFixed(3)), anomalyRisk: Number((anomalies.length ? average(anomalies.map(anomaly => anomaly.severity)) : 0).toFixed(3)) },
    policyAdjustments,
  };
}

export function adaptPeople(people: PeopleState, intelligence: IntelligenceState): PeopleState {
  const stressed = intelligence.anomalies.some(anomaly => anomaly.type === 'NPC mood collapse');
  const correction = stressed ? 0.03 : 0.01;
  return {
    ...people,
    people: people.people.map((person: Person) => ({ ...person, mood: clamp(person.mood + (0.5 - person.mood) * correction), compliance: clamp(person.compliance + (intelligence.governance.umbrellaAction === 'enable' ? 0.02 : -0.01)), productivity: clamp(person.productivity + (person.productivity < 0.5 ? 0.02 : -0.005)) })),
    factions: people.factions.map((faction: PeopleFaction) => ({ ...faction, support: clamp(faction.support + (intelligence.governance.umbrellaAction === 'enable' ? 0.01 : -0.01)), dissent: clamp(faction.dissent + (intelligence.governance.umbrellaAction === 'enable' ? -0.01 : 0.01)) })),
  };
}
