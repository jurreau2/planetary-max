import type { GlobalState, PlanetaryState } from './planetary_state';
import type { QuantumSignature } from '../cognitive/quantum_signature';

export type Planet = { id: string; state: PlanetaryState; coherence: number };
export type SharedSignal = { id: string; source: string; kind: 'event' | 'anomaly' | 'governance'; payload: string; tick: number };
export type MarketplaceItem = { id: string; name: string; category: 'app' | 'governance'; description: string; price: string; enabled: boolean };
export type EcosystemState = {
  regions: string[];
  planets: Planet[];
  sharedSignals: SharedSignal[];
  marketplace: MarketplaceItem[];
  revenue: { apps: number; governance: number; ecosystem: number };
  quantumSuite: { coherence: number; anomalies: number; forecast: number };
};

export function createEcosystemState(state: PlanetaryState): EcosystemState {
  return {
    regions: ['core', 'frontier', 'coast', 'highlands'],
    planets: [
      { id: 'terra', state, coherence: 1 },
      { id: 'luna', state: { ...state, population: Math.floor(state.population * 0.1), energy: Math.floor(state.energy * 0.5) }, coherence: 1 },
      { id: 'aether', state: { ...state, population: Math.floor(state.population * 0.05), energy: Math.floor(state.energy * 0.25) }, coherence: 1 },
    ],
    sharedSignals: [],
    marketplace: [
      { id: 'population-tracker', name: 'Population Tracker', category: 'app', description: 'Cross-world population and stability dashboard', price: '$99/mo', enabled: true },
      { id: 'resource-dashboard', name: 'Resource Dashboard', category: 'app', description: 'Multi-planet resource analytics', price: '$149/mo', enabled: true },
      { id: 'forecast-engine', name: 'Forecast Engine', category: 'app', description: 'Kernel, planetary, and quantum forecasting', price: '$299/mo', enabled: true },
      { id: 'umbrella-extensions', name: 'Umbrella Extensions', category: 'governance', description: 'Cross-world governance controls', price: '$1,500/mo', enabled: true },
      { id: 'apex-enforcement', name: 'Apex Enforcement Modules', category: 'governance', description: 'Configurable enforcement signals', price: '$2,000/mo', enabled: true },
      { id: 'civic-policy-packs', name: 'Civic Policy Packs', category: 'governance', description: 'Reusable policy modules for regions and planets', price: '$750/mo', enabled: true },
    ],
    revenue: { apps: 0, governance: 0, ecosystem: 0 },
    quantumSuite: { coherence: 1, anomalies: 0, forecast: 0 },
  };
}

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function evolveEcosystem(current: GlobalState, quantum: QuantumSignature, kernel: { physics: { gravity: number; temperature: number; collisions: number } }): EcosystemState {
  const previous = current.ecosystem ?? createEcosystemState(current);
  const umbrellaEnabled = current.umbrella.mode === 'enabled';
  const terra = previous.planets.find(planet => planet.id === 'terra') ?? previous.planets[0];
  const sharedSignals: SharedSignal[] = [
    ...previous.sharedSignals,
    ...current.events.slice(-5).map((event, index) => ({ id: `event-${current.tick}-${index}`, source: 'terra', kind: 'event' as const, payload: event, tick: current.tick })),
    ...(quantum.coherence < 0.5 ? [{ id: `anomaly-${current.tick}`, source: 'terra', kind: 'anomaly' as const, payload: quantum.hash, tick: current.tick }] : []),
    { id: `governance-${current.tick}`, source: 'umbrella', kind: 'governance' as const, payload: umbrellaEnabled ? 'enabled' : 'disabled', tick: current.tick },
  ].slice(-100);
  const planets = previous.planets.map(planet => {
    if (planet.id === 'terra') return { ...planet, state: current, coherence: quantum.coherence };
    const factor = planet.id === 'luna' ? 0.1 : 0.05;
    return { ...planet, state: { ...planet.state, tick: current.tick, updatedAt: current.updatedAt, population: Math.max(0, Math.floor(planet.state.population + (current.population - terra.state.population) * factor)), events: [...planet.state.events, ...current.events.slice(-3)].slice(-100) }, coherence: Math.max(0, Math.min(1, planet.coherence + (quantum.coherence - planet.coherence) * 0.1)) };
  });
  const coherence = average(planets.map(planet => planet.coherence));
  const anomalyCount = sharedSignals.filter(signal => signal.kind === 'anomaly').length;
  const appsRevenue = previous.marketplace.filter(item => item.category === 'app' && item.enabled).length * 99;
  const governanceRevenue = previous.marketplace.filter(item => item.category === 'governance' && item.enabled).length * 750;
  return { ...previous, planets, sharedSignals, revenue: { apps: appsRevenue, governance: governanceRevenue, ecosystem: appsRevenue + governanceRevenue }, quantumSuite: { coherence, anomalies: anomalyCount, forecast: Number((coherence * (umbrellaEnabled ? 1 : 0.8)).toFixed(3)) }, regions: previous.regions.length ? previous.regions : ['core', 'frontier', 'coast', 'highlands'] };
}

export function ecosystemPlanet(current: GlobalState, id: string): Planet | undefined { return current.ecosystem?.planets.find(planet => planet.id === id); }
