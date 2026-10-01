export type JsonObject = Record<string, unknown>;

export function captureEvolutionTrace(result: { meta?: JsonObject }): JsonObject {
  const meta = result?.meta ?? {};
  const phases = Array.isArray(meta.autonomyState?.phases)
    ? (meta.autonomyState?.phases as unknown[]).map((value) => Number(value))
    : [];

  const ordered = [...phases].sort((a, b) => a - b);

  return {
    phases,
    ordered,
    isOrdered: JSON.stringify(phases) === JSON.stringify(ordered),
    capturedAt: Date.now(),
  };
}
