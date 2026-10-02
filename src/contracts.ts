import type { Bindings, KernelEnvelope, KernelResult } from "./types";

export type { Bindings, KernelEnvelope, KernelResult };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createEnvelope(
  type: string,
  payload: Record<string, unknown>,
  identity: string,
  governanceContext: Record<string, unknown> = {},
  id: string = crypto.randomUUID(),
): KernelEnvelope {
  return {
    id,
    type,
    payload,
    identity,
    governanceContext,
  } as KernelEnvelope;
}

export function extractLaneData(response: unknown): unknown {
  if (!isRecord(response)) return {};
  if ("output" in response) return response.output;

  const results = response.results;
  if (Array.isArray(results) && isRecord(results[0]) && "data" in results[0]) return results[0].data;

  if (!isRecord(response.result)) return {};
  const lanes = response.result.lanes;
  if (!Array.isArray(lanes) || !isRecord(lanes[0]) || !isRecord(lanes[0].result)) return {};
  const laneResults = lanes[0].result.results;
  if (!Array.isArray(laneResults) || !isRecord(laneResults[0]) || !isRecord(laneResults[0].result)) return {};
  return laneResults[0].result.data ?? {};
}

export function normalizeResponse(result: KernelResult, envelope: KernelEnvelope): Record<string, unknown> {
  if (!result.ok) return result as unknown as Record<string, unknown>;

  return {
    ok: true,
    data: extractLaneData(result),
    meta: {
      messageId: result.messageId ?? envelope.id,
      type: result.type ?? envelope.type,
      identity: result.identity ?? envelope.identity,
      route: result.route ?? result.result?.lanes,
    },
  };
}
