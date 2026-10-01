export type AutonomyMode = "off" | "core" | "full";
export type JsonObject = Record<string, unknown>;

export function refineAutonomyMode(meta: JsonObject): AutonomyMode {
  const consistency = (meta.consistency as JsonObject | undefined) ?? {};
  const score = typeof meta.autonomyScore === "number" ? meta.autonomyScore : 0;
  const mode = typeof meta.autonomy === "string" ? meta.autonomy : "off";
  const phases = Array.isArray(meta.autonomyState?.phases)
    ? (meta.autonomyState?.phases as unknown[]).map((value) => Number(value))
    : [];

  const isConsistent = consistency.valid === true;

  if (isConsistent && score >= 0.8 && phases.length >= 5) return "full";
  if (isConsistent && score >= 0.45 && phases.length >= 3) return "core";
  if (mode === "full" && score >= 0.7) return "full";
  if (mode === "core" && score >= 0.35) return "core";
  return "off";
}
