//
// Kernel Evolution Layer
// Autonomy mode routing and contract enforcement
//

import type { KernelResult } from "./types";

export type AutonomyMode = "off" | "core" | "full" | undefined;

type AutonomyMeta = {
  mode: "off" | "core" | "full";
  phasesExecuted: number[];
  timestamp: number;
};

export function evolveKernelResult(
  result: KernelResult,
  mode: AutonomyMode
): KernelResult {
  // Failed results bypass autonomy entirely
  if (!result.ok) {
    return {
      ...result,
      ok: false,
    };
  }

  const resolvedMode: "off" | "core" | "full" =
    mode === "core" || mode === "full" ? mode : "off";

  // Mode "off" → return original result unchanged
  if (resolvedMode === "off") {
    return {
      ...result,
      ok: true,
    };
  }

  // Phase sets: core = 14-16, full = 14-18
  const corePhases = [14, 15, 16];
  const fullPhases = [14, 15, 16, 17, 18];

  const phasesExecuted = resolvedMode === "core" ? corePhases : fullPhases;

  const autonomyMeta: AutonomyMeta = {
    mode: resolvedMode,
    phasesExecuted,
    timestamp: Date.now(),
  };

  // Return canonical result with autonomy meta in body
  return {
    ...result,
    ok: true,
    body: {
      ...result.body,
      autonomyMode: autonomyMeta.mode,
      autonomyPhases: autonomyMeta.phasesExecuted,
    },
  };
}
