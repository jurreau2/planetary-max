import type { Envelope, Lane, NormalizedKernelResponse } from "./types";

export type { Envelope, Lane, NormalizedKernelResponse };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createEnvelope(
  type: string,
  payload: Record<string, unknown>,
  identity: string,
  governanceContext: Record<string, unknown> = {},
): Envelope {
  const publicIdentity = {
    credential: identity,
    id: identity || "system",
    type: "user",
    authenticated: Boolean(identity),
    roles: ["user"],
    attributes: payload,
  };

  const governance = {
    umbrella: { allowed: true, policy: "planetary" },
    planetary: { allowed: true, policy: "planetary" },
    session: { allowed: true, policy: "session" },
  };

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `env-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    payload,
    identity: publicIdentity,
    governanceContext: {
      ...governance,
      ...governanceContext,
    },
    metadata: {
      route: {
        entryId: type,
        lane: (governanceContext.lane as Lane | undefined) ?? "sim",
      },
    },
  };
}

export function extractLaneData(response: unknown): unknown {
  if (!isRecord(response)) return {};
  if ("data" in response) return response.data;
  if ("body" in response) return response.body;
  return {};
}

export function normalizeResponse(
  result: NormalizedKernelResponse,
  envelope: Envelope,
): Record<string, unknown> {
  if (!result.ok) {
    return {
      ok: false,
      messageId: result.messageId,
      status: result.status,
      error: result.error,
    };
  }

  const data = result.data ?? {};
  return {
    ok: true,
    messageId: result.messageId,
    status: result.status,
    data,
    meta: {
      lane: envelope.metadata?.route?.lane ?? "sim",
      identity: envelope.identity.id,
      governance: envelope.governanceContext,
    },
  };
}
