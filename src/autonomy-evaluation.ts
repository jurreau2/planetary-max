export type JsonObject = Record<string, unknown>;

export function evaluateAutonomy(meta: JsonObject): JsonObject {
  const mode = typeof meta.autonomy === "string" ? meta.autonomy : "off";
  const phases = Array.isArray(meta.autonomyState?.phases)
    ? (meta.autonomyState?.phases as unknown[]).map((value) => Number(value))
    : [];
  const score = scoreAutonomy(meta);

  return {
    mode,
    phases,
    score,
    stable: mode !== "off" && phases.length > 0,
    evaluatedAt: Date.now(),
  };
}

export function scoreAutonomy(meta: JsonObject): number {
  const mode = typeof meta.autonomy === "string" ? meta.autonomy : "off";
  const phases = Array.isArray(meta.autonomyState?.phases)
    ? (meta.autonomyState?.phases as unknown[]).map((value) => Number(value))
    : [];

  const phaseWeight = phases.length === 0 ? 0 : Math.min(phases.length / 5, 1);
  const modeWeight = mode === "off" ? 0.2 : mode === "core" ? 0.6 : 0.95;
  const sourceWeight = typeof meta.source === "string" ? 0.15 : 0;
  const laneWeight = typeof meta.lane === "string" ? 0.1 : 0;

  return Number(Math.min(1, phaseWeight + modeWeight + sourceWeight + laneWeight).toFixed(3));
}
