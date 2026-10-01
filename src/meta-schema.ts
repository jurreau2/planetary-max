//
// Final Meta Schema Definition
// Grouped, explicit, validated at assembly boundary
//

export type AutonomyMode = "off" | "core" | "full";

export type MetaSource = "kernel" | "worker" | "gateway" | "external";

export type KernelMetaBase = Readonly<{
  source: MetaSource;
  lane: string;
  autonomy: AutonomyMode;
  timestamp: number;
}>;

export type PhaseMetadata = Readonly<{
  evolution?: unknown;
  curvatureFeedback?: unknown;
  intelligence?: unknown;
  route?: unknown;
  state?: unknown;
  substrate?: unknown;
  modal?: unknown;
}>;

export type AutonomyStateMetadata = Readonly<{
  full?: boolean;
  phases?: readonly number[];
}>;

export type KernelMetaEvolved = KernelMetaBase &
  Readonly<{
    sim?: PhaseMetadata;
    identity?: PhaseMetadata;
    umbrella?: PhaseMetadata;
    mesh?: PhaseMetadata;
    quantum?: PhaseMetadata;
    blue?: PhaseMetadata;
    market?: PhaseMetadata;
    autonomyState?: AutonomyStateMetadata;
  }>;

export type KernelMeta = KernelMetaBase | KernelMetaEvolved;

export function isKernelMetaBase(meta: unknown): meta is KernelMetaBase {
  return (
    typeof meta === "object" &&
    meta !== null &&
    typeof (meta as any).source === "string" &&
    typeof (meta as any).lane === "string" &&
    typeof (meta as any).autonomy === "string" &&
    typeof (meta as any).timestamp === "number"
  );
}

export function normalizeMetaBase(
  meta: unknown,
  defaults: { source: MetaSource; lane: string }
): KernelMetaBase {
  if (!isKernelMetaBase(meta)) {
    return {
      source: defaults.source,
      lane: defaults.lane,
      autonomy: "off",
      timestamp: Date.now(),
    };
  }
  return meta;
}

export function upgradeMetaWithPhases(
  base: KernelMetaBase,
  phases: Record<string, unknown>
): KernelMetaEvolved {
  return {
    ...base,
    ...phases,
  };
}

export function createAutonomyStateMetadata(
  mode: AutonomyMode,
  phases: readonly number[]
): AutonomyStateMetadata {
  return {
    full: mode === "full",
    phases: [...phases],
  };
}
