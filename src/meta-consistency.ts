export type JsonObject = Record<string, unknown>;

export function checkMetaConsistency(meta: JsonObject): JsonObject {
  const required = ["source", "lane", "autonomy", "timestamp", "autonomyState"];
  const missing = required.filter((field) => meta[field] === undefined || meta[field] === null);

  const autonomyState = meta.autonomyState as JsonObject | undefined;
  const phases = Array.isArray(autonomyState?.phases)
    ? (autonomyState.phases as unknown[]).map((value) => Number(value))
    : [];

  const mode = typeof meta.autonomy === "string" ? meta.autonomy : "off";
  const lane = typeof meta.lane === "string" ? meta.lane : "unknown";
  const source = typeof meta.source === "string" ? meta.source : "unknown";

  const result = {
    valid: missing.length === 0 && phases.length > 0 && (mode === "off" || mode === "core" || mode === "full"),
    missing,
    mode,
    source,
    lane,
    phases,
    timestamp: typeof meta.timestamp === "number" ? meta.timestamp : null,
    requiredFields: [...required],
    preserved: {
      source: source,
      lane: lane,
      autonomy: mode,
      timestamp: typeof meta.timestamp === "number" ? meta.timestamp : null,
    },
  };

  return result;
}
