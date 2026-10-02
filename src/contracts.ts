import type {
  Bindings,
  Envelope,
  GovernanceEnvelope,
  IdentityEnvelope,
  JsonObject,
  Lane,
  NormalizedKernelResponse,
} from "./types";

export type { Bindings, Envelope, JsonObject };
export type KernelEnvelope = Envelope;
export type KernelResult = NormalizedKernelResponse;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createEnvelope(
  type: string,
  payload: Record<string, unknown>,
  identity: string,
  governanceContext: Record<string, unknown> = {},
): Envelope {
  const publicIdentity: IdentityEnvelope = {
    credential: identity,
    id: identity || "system",
    type: "user",
    authenticated: Boolean(identity),
    roles: ["user"],
    attributes: payload,
  };

  const governance: GovernanceEnvelope = {
    umbrella: { allowed: true, policy: "planetary" },
    planetary: { allowed: true, policy: "planetary" },
    session: { allowed: true, policy: "session" },
  };

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `env-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    payload: payload as JsonObject,
    identity: publicIdentity,
    governanceContext: {
      ...governance,
      ...governanceContext,
    } as GovernanceEnvelope,
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
  result: KernelResult,
  envelope: KernelEnvelope,
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
