export type AutonomyGoal = {
  stabilityTarget: number;
  populationTarget: number;
  productionTarget: number;
  coherenceTarget: number;
  revenueTarget: number;
};

export type AutonomyDecision = {
  id: string;
  type: 'umbrella' | 'policy' | 'resource' | 'population' | 'quantum' | 'routing' | 'revenue';
  value: string | number;
  reason: string;
  tick: number;
};

export type AutonomyAction = {
  id: string;
  kind: 'enable_umbrella' | 'relax_enforcement' | 'stability_program' | 'resource_boost' | 'population_support' | 'quantum_alignment' | 'route_signals' | 'activate_apps';
  description: string;
  tick: number;
};

export type AutonomySignal = {
  stability: number;
  population: number;
  production: number;
  resources: Record<string, number>;
  factionSupport: number;
  factionDissent: number;
  npcMood: number;
  npcCompliance: number;
  quantumCoherence: number;
  ecosystem: { planets: number; revenue: number; anomalies: number; forecast: number };
  revenue: number;
  tick: number;
};

export type AutonomyState = {
  goals: AutonomyGoal;
  signals: AutonomySignal;
  decisions: AutonomyDecision[];
  actions: AutonomyAction[];
};

export function createAutonomyGoals(): AutonomyGoal {
  return { stabilityTarget: 1.0, populationTarget: 1200, productionTarget: 150, coherenceTarget: 0.7, revenueTarget: 1000 };
}

export function createAutonomyState(): AutonomyState {
  return {
    goals: createAutonomyGoals(),
    signals: {
      stability: 1,
      population: 0,
      production: 0,
      resources: {},
      factionSupport: 0,
      factionDissent: 0,
      npcMood: 0,
      npcCompliance: 0,
      quantumCoherence: 0,
      ecosystem: { planets: 0, revenue: 0, anomalies: 0, forecast: 0 },
      revenue: 0,
      tick: 0,
    },
    decisions: [],
    actions: [],
  };
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

export function scanAutonomySignals(state: any): AutonomySignal {
  const regionValues = Object.values(state?.regions ?? {}) as Array<{ stability?: number; production?: number; population?: number }>;
  const resourceValues = Object.values(state?.resources ?? {}) as number[];
  const factions = (state?.npc?.factions ?? state?.people?.factions ?? []) as Array<{ support?: number; dissent?: number }>;
  const citizens = (state?.npc?.citizens ?? state?.people?.people ?? []) as Array<{ mood?: number; compliance?: number }>;
  const stability = average(regionValues.map(region => region?.stability ?? 1));
  const population = Number(state?.population ?? 0);
  const production = average(regionValues.map(region => region?.production ?? 0));
  const resources = state?.resources ?? {};
  const factionSupport = average(factions.map(faction => faction?.support ?? 0));
  const factionDissent = average(factions.map(faction => faction?.dissent ?? 0));
  const npcMood = average(citizens.map(citizen => citizen?.mood ?? 0.5));
  const npcCompliance = average(citizens.map(citizen => citizen?.compliance ?? 0.5));
  const quantum = state?.ecosystem?.quantumSuite?.coherence ?? state?.quantum?.coherence ?? state?.coherence ?? 0.7;
  const ecosystemRevenue = state?.ecosystem?.revenue?.ecosystem ?? state?.ecosystem?.revenue ?? 0;
  const revenue = Number(state?.revenue ?? ecosystemRevenue ?? 0);

  return {
    stability,
    population,
    production,
    resources,
    factionSupport,
    factionDissent,
    npcMood,
    npcCompliance,
    quantumCoherence: Number(quantum),
    ecosystem: {
      planets: Array.isArray(state?.ecosystem?.planets) ? state.ecosystem.planets.length : 1,
      revenue: ecosystemRevenue,
      anomalies: Number(state?.ecosystem?.quantumSuite?.anomalies ?? state?.anomalies ?? 0),
      forecast: Number(state?.ecosystem?.quantumSuite?.forecast ?? state?.forecast ?? 0),
    },
    revenue,
    tick: Number(state?.tick ?? 0),
  };
}

export function selectAutonomyDecisions(signals: AutonomySignal, goals: AutonomyGoal): { decisions: AutonomyDecision[]; actions: AutonomyAction[] } {
  const decisions: AutonomyDecision[] = [];
  const actions: AutonomyAction[] = [];

  const tick = signals.tick;

  if (signals.stability < goals.stabilityTarget) {
    decisions.push({ id: `umbrella-${tick}`, type: 'umbrella', value: 'enabled', reason: 'Stability below target, enabling enforcement', tick });
    actions.push({ id: `enable-umbrella-${tick}`, kind: 'enable_umbrella', description: 'Enable Umbrella enforcement', tick });
    decisions.push({ id: `policy-${tick}`, type: 'policy', value: 'stability program', reason: 'Apply stability program to recover social balance', tick });
    actions.push({ id: `stability-program-${tick}`, kind: 'stability_program', description: 'Apply stabilizing civic policy package', tick });
  } else if (signals.stability > goals.stabilityTarget) {
    decisions.push({ id: `umbrella-${tick}`, type: 'umbrella', value: 'relaxed', reason: 'Stability above target, relaxing enforcement', tick });
    actions.push({ id: `relax-enforcement-${tick}`, kind: 'relax_enforcement', description: 'Relax enforcement to preserve civic flexibility', tick });
  }

  if (signals.population < goals.populationTarget) {
    decisions.push({ id: `population-${tick}`, type: 'population', value: 'food/water', reason: 'Population below target, increasing survival resources', tick });
    actions.push({ id: `population-support-${tick}`, kind: 'population_support', description: 'Increase food and water allocation and reduce dissent', tick });
  }

  if (signals.quantumCoherence < goals.coherenceTarget) {
    decisions.push({ id: `quantum-${tick}`, type: 'quantum', value: 'alignment', reason: 'Coherence below target, reducing anomaly risk', tick });
    actions.push({ id: `quantum-alignment-${tick}`, kind: 'quantum_alignment', description: 'Adjust quantum basis and stabilize coherence profile', tick });
  }

  if (signals.revenue < goals.revenueTarget) {
    decisions.push({ id: `revenue-${tick}`, type: 'revenue', value: 'forecasting_and_services', reason: 'Revenue below target, activating monetizable services', tick });
    actions.push({ id: `activate-apps-${tick}`, kind: 'activate_apps', description: 'Activate forecasting apps and simulation services', tick });
  }

  const resourceActionNeeded = (signals.resources.food ?? 0) < (goals.populationTarget * 2) || (signals.resources.water ?? 0) < (goals.populationTarget * 2) || (signals.resources.minerals ?? 0) < 500;
  if (resourceActionNeeded) {
    decisions.push({ id: `resource-${tick}`, type: 'resource', value: 'rebalancing', reason: 'Resource pool below sustainable range, reallocating supply', tick });
    actions.push({ id: `resource-boost-${tick}`, kind: 'resource_boost', description: 'Increase food, water, and mineral allocation to at-risk regions', tick });
  }

  if (signals.ecosystem.planets > 1 && signals.ecosystem.forecast > 0) {
    decisions.push({ id: `route-${tick}`, type: 'routing', value: 'shared_signals', reason: 'Route stability, production, and anomaly signals across planets', tick });
    actions.push({ id: `route-signals-${tick}`, kind: 'route_signals', description: 'Share mitigation signals across the ecosystem', tick });
  }

  return { decisions, actions };
}

export function allocateAutonomyResources(state: any, signals: AutonomySignal, decisions: AutonomyDecision[]): Record<string, number> {
  const nextResources = { ...(state?.resources ?? {}) };
  const lowStabilityRegions = Object.entries(state?.regions ?? {}).filter(([, region]: any[]) => (region?.stability ?? 1) < 1);
  const highProductionRegions = Object.entries(state?.regions ?? {}).filter(([, region]: any[]) => (region?.production ?? 0) > 100);

  if (signals.population < createAutonomyGoals().populationTarget || signals.npcMood < 0.6) {
    nextResources.food = Number((nextResources.food ?? 0) + 100);
    nextResources.water = Number((nextResources.water ?? 0) + 100);
  }

  for (const [regionId, region] of lowStabilityRegions as [string, any][]) {
    nextResources.food = Number((nextResources.food ?? 0) + 25);
    nextResources.water = Number((nextResources.water ?? 0) + 25);
    nextResources.energy = Number((nextResources.energy ?? 0) + 10);
    if (region) region.stability = clamp((region.stability ?? 1) + 0.05, 0, 1.5);
  }

  for (const [regionId, region] of highProductionRegions as [string, any][]) {
    nextResources.minerals = Number((nextResources.minerals ?? 0) + 15);
    nextResources.energy = Number((nextResources.energy ?? 0) + 15);
    if (region) region.production = Number((region.production ?? 0) + 5);
  }

  if (signals.quantumCoherence < createAutonomyGoals().coherenceTarget) {
    nextResources.energy = Number((nextResources.energy ?? 0) + 20);
  }

  return nextResources;
}

export function synthesizeAutonomyDecisionSet(state: any): AutonomyState {
  const goals = createAutonomyGoals();
  const signals = scanAutonomySignals(state);
  const { decisions, actions } = selectAutonomyDecisions(signals, goals);

  const nextState = {
    goals,
    signals,
    decisions,
    actions,
  };

  return nextState;
}

export function applyAutonomy(state: any): any {
  const goals = createAutonomyGoals();
  const signals = scanAutonomySignals(state);
  const { decisions, actions } = selectAutonomyDecisions(signals, goals);
  const resources = allocateAutonomyResources(state, signals, decisions);

  const nextState = {
    ...state,
    autonomy: {
      goals,
      signals,
      decisions,
      actions,
    },
    resources,
    umbrella: decisions.some(decision => decision.type === 'umbrella' && decision.value === 'enabled') ? { mode: 'enabled' } : (state?.umbrella ?? { mode: 'enabled' }),
  };

  if (signals.population < goals.populationTarget) {
    nextState.population = Math.max(Number(state?.population ?? 0), goals.populationTarget);
  }

  if (signals.quantumCoherence < goals.coherenceTarget) {
    nextState.coherence = clamp(signals.quantumCoherence + 0.05, 0, 1);
  }

  if (signals.revenue < goals.revenueTarget) {
    nextState.revenue = Number((state?.revenue ?? 0) + 100);
  }

  return nextState;
}
