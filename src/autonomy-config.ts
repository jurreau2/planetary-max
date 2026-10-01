//
// Autonomy Configuration Layer
// Reads and validates autonomy mode from environment
// Provides explicit routing for mode-aware dispatch
//

export type AutonomyMode = "full" | "core" | "off";

export type AutonomyConfig = Readonly<{
  enabled: boolean;
  mode: AutonomyMode;
  phasesToExecute: readonly string[];
}>;

const VALID_MODES: readonly AutonomyMode[] = ["full", "core", "off"];

const PHASE_MAP: Readonly<Record<AutonomyMode, readonly string[]>> = {
  off: [],
  core: ["phase-14-sim-core-evolution", "phase-15-truth-engine"],
  full: [
    "phase-14-sim-core-evolution",
    "phase-15-truth-engine",
    "phase-16-mesh-federation",
    "phase-17-quantum-structured",
    "phase-18-full-autonomy",
  ],
};

export function parseAutonomyMode(value: unknown): AutonomyMode {
  if (typeof value === "string" && VALID_MODES.includes(value as AutonomyMode)) {
    return value as AutonomyMode;
  }
  return "core";
}

export function parseAutonomyEnabled(value: unknown): boolean {
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  if (typeof value === "boolean") {
    return value;
  }
  return true;
}

export function resolveAutonomyConfig(env: Record<string, unknown>): AutonomyConfig {
  const autonomyEnabled = parseAutonomyEnabled(env.AUTONOMY_ENABLED);
  const rawMode = env.AUTONOMY_MODE;

  if (!autonomyEnabled) {
    return {
      enabled: false,
      mode: "off",
      phasesToExecute: [],
    };
  }

  const mode = parseAutonomyMode(rawMode);
  const phasesToExecute = PHASE_MAP[mode];

  return {
    enabled: true,
    mode,
    phasesToExecute,
  };
}

export function isAutonomyModeEnabled(mode: AutonomyMode): boolean {
  return mode !== "off";
}

export function getPhaseCount(mode: AutonomyMode): number {
  return PHASE_MAP[mode].length;
}

export function shouldEvolveResult(mode: AutonomyMode, resultOk: boolean): boolean {
  return isAutonomyModeEnabled(mode) && resultOk;
}
