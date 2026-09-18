import { Hono } from 'hono';
import { deepFreeze, stableHash } from './apex/canonical.ts';
import type { JsonValue } from './apex/types.ts';
import { validateDeploymentReadiness } from './deploy/readiness.ts';
import type { DeploymentBindings } from './deploy/readiness.ts';
import { resolveKernelRoute } from './deploy/routes.ts';
import type { KernelRoute } from './deploy/routes.ts';
import {
  createObservabilityEvent,
  executeFailClosed,
  isJsonValue,
  normalizeKernelError,
  serializeObservabilityEvent,
} from './deploy/validation.ts';

type JsonObject = { readonly [key: string]: JsonValue };

type KernelEnvelope = {
  readonly id: string;
  readonly type: string;
  readonly payload: JsonObject;
  readonly identity: string;
  readonly governanceContext: JsonObject;
};

type KernelResult = {
  readonly ok?: boolean;
  readonly error?: { readonly code?: string; readonly message?: string };
  readonly [key: string]: unknown;
};

class InvalidMessageError extends Error {}

const app = new Hono<{ Bindings: DeploymentBindings }>();

/** A single kernel-primary route prevents local health, state, or fallback responses. */
app.all('*', async (context) => {
  const readiness = validateDeploymentReadiness(context.env);
  if (!readiness.ready) {
    return normalizeKernelError('DEPLOYMENT_NOT_READY', 'Deployment bindings or invariants are not ready', 503);
  }

  const identity = bearerToken(context.req.header('Authorization'));
  if (identity === null) return normalizeKernelError('UNAUTHENTICATED', 'Bearer token required', 401);

  const url = new URL(context.req.url);
  let route: KernelRoute;
  try {
    route = resolveKernelRoute(context.req.method, url.pathname);
  } catch {
    return normalizeKernelError('ROUTE_FORBIDDEN', 'Local route is not available', 404);
  }

  let body: JsonValue;
  try {
    body = await readRequestBody(context.req.raw, route);
  } catch {
    return normalizeKernelError('INVALID_JSON', 'Request body must contain valid JSON', 400);
  }

  let envelope: KernelEnvelope;
  try {
    envelope = requestEnvelope(route, url, body, identity);
  } catch (error) {
    if (error instanceof InvalidMessageError) {
      return normalizeKernelError('INVALID_MESSAGE', error.message, 400);
    }
    throw error;
  }
  return kernelResponse(context.env, envelope);
});

async function readRequestBody(request: Request, route: KernelRoute): Promise<JsonValue> {
  if (request.method === 'GET' || request.method === 'HEAD') return null;
  const text = await request.text();
  if (text.length === 0) return null;
  const contentType = request.headers.get('Content-Type') ?? '';
  if (route.messageType !== 'kernel.message' && !contentType.includes('application/json')) return text;
  const parsed: unknown = JSON.parse(text);
  if (!isJsonValue(parsed)) throw new Error('Request JSON is outside the supported value domain');
  return parsed;
}

function requestEnvelope(route: KernelRoute, url: URL, body: JsonValue, identity: string): KernelEnvelope {
  const queryEntries: Array<[string, string]> = [];
  url.searchParams.forEach((value, key) => queryEntries.push([key, value]));
  const query = queryEntries
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0)
    .map(([key, value]) => [key, value] as const);
  const submitted = isJsonObject(body) ? body : undefined;
  if (route.messageType === 'kernel.message' && typeof submitted?.type === 'string' && !isJsonObject(submitted.payload)) {
    throw new InvalidMessageError('type requires an object payload');
  }
  const submittedType = route.messageType === 'kernel.message' && typeof submitted?.type === 'string'
    ? submitted.type
    : route.messageType;
  const submittedPayload = route.messageType === 'kernel.message' && isJsonObject(submitted?.payload)
    ? submitted.payload
    : undefined;
  const tickPayload = route.messageType === 'universe.tick' ? (submitted ?? {}) : undefined;
  const payload: JsonObject = submittedPayload ?? tickPayload ?? {
    request: {
      method: route.method,
      path: route.path,
      query,
      body,
    },
  };
  const governanceContext: JsonObject = {
    surface: 'cloudflare-worker',
    routeId: route.routeId,
    identityRequired: route.identityRequired,
    governanceRequired: route.governanceRequired,
    apexGovernanceRequired: route.apexGovernanceRequired,
  };
  return createEnvelope(submittedType, payload, identity, governanceContext);
}

function createEnvelope(
  type: string,
  payload: JsonObject,
  identity: string,
  governanceContext: JsonObject,
): KernelEnvelope {
  const envelopeIdentity: JsonValue = { type, payload, identity, governanceContext };
  return deepFreeze({
    id: `kernel-message-${stableHash(envelopeIdentity)}`,
    type,
    payload,
    identity,
    governanceContext,
  });
}

async function kernelResponse(env: DeploymentBindings, envelope: KernelEnvelope): Promise<Response> {
  try {
    const response = await callKernel(env, envelope);
    const parsed: unknown = await response.json();
    if (!isKernelResult(parsed)) throw new Error('Kernel response is not normalized JSON');
    const status = parsed.ok === false ? kernelErrorStatus(parsed.error?.code) : response.status;
    return Response.json(parsed, { status });
  } catch {
    const event = createObservabilityEvent(0, 'error', 'KERNEL_UNAVAILABLE', { envelopeId: envelope.id });
    console.error(serializeObservabilityEvent(event));
    return normalizeKernelError('KERNEL_UNAVAILABLE', 'Kernel bridge unavailable', 503);
  }
}

async function callKernel(env: DeploymentBindings, envelope: KernelEnvelope): Promise<Response> {
  if (env.RESILIENCE_MODE !== 'strict' || env.CIRCUIT_BREAKER_MODE !== 'fail-closed') {
    throw new Error('Kernel resilience configuration is not fail-closed');
  }
  const request = new Request('http://kernel/api/kernel/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
  });
  return executeFailClosed(() => env.KERNEL_SERVICE.fetch(request));
}

function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? '');
  return match?.[1]?.trim() || null;
}

function kernelErrorStatus(code: string | undefined): number {
  if (code === 'UNAUTHENTICATED') return 401;
  if (code === 'FORBIDDEN') return 403;
  if (code === 'INVALID_MESSAGE' || code === 'INVALID_JSON') return 400;
  return 500;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && isJsonValue(value);
}

function isKernelResult(value: unknown): value is KernelResult {
  if (!isJsonObject(value) || (value.ok !== undefined && typeof value.ok !== 'boolean')) return false;
  if (value.error === undefined) return true;
  if (!isJsonObject(value.error)) return false;
  return (value.error.code === undefined || typeof value.error.code === 'string')
    && (value.error.message === undefined || typeof value.error.message === 'string');
}

export { app, createEnvelope };
export * from './apex/index.ts';
export * from './bindings/index.ts';
export * from './deploy/readiness.ts';
export * from './deploy/routes.ts';
export * from './deploy/validation.ts';
export default app;
