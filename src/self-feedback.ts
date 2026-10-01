export type JsonObject = Record<string, unknown>;

export function applySelfFeedback(result: { meta?: JsonObject; ok?: boolean }): JsonObject {
  const meta = result?.meta ?? {};
  const mode = typeof meta.autonomy === "string" ? meta.autonomy : "off";
  const score = typeof meta.autonomyScore === "number" ? meta.autonomyScore : 0;
  const consistent = (meta.consistency as JsonObject | undefined)?.valid === true;

  const feedback = {
    accepted: Boolean(result?.ok !== false),
    mode,
    score,
    consistent,
    recommendedMode: mode === "full" && score >= 0.8 ? "full" : mode === "core" && score >= 0.45 ? "core" : "off",
    appliedAt: Date.now(),
  };

  return {
    ...feedback,
    maintainedShape: true,
  };
}
