import type { AutonomyGoal, AutonomyState } from './autonomy';

export type AutonomyFeedbackLog = {
  tick: number;
  stability: number;
  population: number;
  production: number;
  coherence: number;
  revenue: number;
  umbrellaMode: 'enabled' | 'disabled';
  civicPolicy: string[];
  actions: string[];
};

export type AutonomyGoalsHistory = {
  tick: number;
  goals: AutonomyGoal;
};

export type AutonomyFeedbackState = {
  tick: number;
  logs: AutonomyFeedbackLog[];
  goalsHistory: AutonomyGoalsHistory[];
};

type FeedbackInput = {
  tick: number;
  autonomy?: AutonomyState;
  umbrella?: { mode: 'enabled' | 'disabled' };
};

export function createAutonomyFeedback(): AutonomyFeedbackState {
  return { tick: 0, logs: [], goalsHistory: [] };
}

export function appendAutonomyFeedback(previous: AutonomyFeedbackState | undefined, input: FeedbackInput): AutonomyFeedbackState {
  const current = previous ?? createAutonomyFeedback();
  const autonomy = input.autonomy;
  const signals = autonomy?.signals;
  const decisions = autonomy?.decisions ?? [];
  const actions = autonomy?.actions ?? [];
  const log: AutonomyFeedbackLog = {
    tick: input.tick,
    stability: signals?.stability ?? 0,
    population: signals?.population ?? 0,
    production: signals?.production ?? 0,
    coherence: signals?.quantumCoherence ?? 0,
    revenue: signals?.revenue ?? 0,
    umbrellaMode: input.umbrella?.mode ?? 'enabled',
    civicPolicy: decisions.filter(decision => decision.type === 'policy').map(decision => String(decision.value)),
    actions: actions.map(action => action.kind),
  };
  const goals = autonomy?.goals;
  return {
    tick: input.tick,
    logs: [...current.logs, log].slice(-200),
    goalsHistory: goals ? [...current.goalsHistory, { tick: input.tick, goals }].slice(-200) : current.goalsHistory,
  };
}
