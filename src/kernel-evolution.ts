//
// Kernel Evolution Layer
// Autonomy mode routing and meta contract enforcement
//

import type { KernelResult } from './types';

export type AutonomyMode = 'off' | 'core' | 'full' | undefined;

type AutonomyMeta = {
  mode: 'off' | 'core' | 'full';
  phasesExecuted: number[];
  timestamp: number;
};

export function evolveKernelResult(
  result: KernelResult,
  mode: AutonomyMode,
): KernelResult {
  // Failed results bypass autonomy entirely
  if (!result.ok) {
    return {
      ...result,
      meta: {
        ...result.meta,
        autonomy: 'off',
        timestamp: result.meta?.timestamp ?? Date.now(),
      },
    };
  }

  const resolvedMode: 'off' | 'core' | 'full' =
    mode === 'core' || mode === 'full' ? mode : 'off';

  // Mode "off" → return original result unchanged, normalize meta
  if (resolvedMode === 'off') {
    return {
      ...result,
      meta: {
        ...result.meta,
        source: result.meta?.source ?? 'kernel',
        lane: result.meta?.lane ?? (Array.isArray(result.route) ? result.route[0] : 'unknown'),
        autonomy: 'off',
        timestamp: result.meta?.timestamp ?? Date.now(),
      },
    };
  }

  // Base meta preservation
  const source = result.meta?.source ?? 'kernel';
  const lane = result.meta?.lane ?? (Array.isArray(result.route) ? result.route[0] : 'unknown');

  // Phase sets: core = 14-16, full = 14-18
  const corePhases = [14, 15, 16];
  const fullPhases = [14, 15, 16, 17, 18];

  const phasesExecuted = resolvedMode === 'core' ? corePhases : fullPhases;

  const autonomyMeta: AutonomyMeta = {
    mode: resolvedMode,
    phasesExecuted,
    timestamp: Date.now(),
  };

  // Apply grouped meta; actual phase data is assumed to be added
  // by ecosystem-architecture.ts helpers. Here we enforce the contract shape.
  return {
    ...result,
    meta: {
      ...result.meta,
      source,
      lane,
      autonomy: autonomyMeta.mode,
      autonomyState: {
        phases: autonomyMeta.phasesExecuted,
      },
      timestamp: autonomyMeta.timestamp,
    },
  };
}
