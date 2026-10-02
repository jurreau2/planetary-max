import { Hono } from "hono";
import { cors } from "hono/cors";

import type { Bindings, Envelope, Lane, NormalizedKernelResponse } from "./types";
import { isRecord } from "./contracts";
import KernelEngine from "./kernel-bridge";

type UmbrellaOperation =
  | "identity.physics.license"
  | "governance.engine.license"
  | "apex.alignment.advisory"
  | "umbrella.sim.pack"
  | "umbrella.market.forecast"
  | "umbrella.identity.mirror"
  | "umbrella.crossworld.access"
  | "structural.truth.license";

const app = new Hono<{ Bindings: Bindings }>();

function invalidJson(message: string): Response {
  return errorResponse(400, "INVALID_JSON", message);
}

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/", (c) =>
  c.json({
    status: "Portal-OS live",
    worker: "planetary-max",
    mode: c.env.PLANETARY_MODE,
    umbrella: c.env.UMBRELLA_ENFORCEMENT,
  }),
);

app.get("/health", (context) =>
  context.json({ status: "ok", service: "planetary-max" }),
);

app.post("/api/kernel/message", async (c) => {
  const identity = bearerToken(c.req.header("Authorization"));
  if (!identity) return unauthenticatedResponse();

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be JSON");
  }

  if (!isRecord(body) || typeof (body as { type?: unknown }).type !== "string") {
    return errorResponse(400, "INVALID_MESSAGE", "type and object payload are required");
  }

  const payload = (body as { payload?: unknown }).payload ?? {};
  if (!isRecord(payload)) {
    return errorResponse(400, "INVALID_MESSAGE", "type and object payload are required");
  }

  const envelope = createEnvelope(
    (body as { type: string }).type,
    payload,
    identity,
  );

  return kernelResponse(c.env, envelope);
});

app.post("/os/kernel/message", async (context) => {
  const identity = bearerToken(context.req.header("Authorization"));
  if (!identity) return unauthenticatedResponse();

  return kernelResponse(context.env, createEnvelope("os.kernel.message", {}, identity), true);
});

const umbrellaRoutes: Array<[string, UmbrellaOperation]> = [
  ["/umbrella/identity/license", "identity.physics.license"],
  ["/umbrella/governance/license", "governance.engine.license"],
  ["/umbrella/apex/advisory", "apex.alignment.advisory"],
  ["/umbrella/sim/pack", "umbrella.sim.pack"],
  ["/umbrella/market/forecast", "umbrella.market.forecast"],
  ["/umbrella/identity/mirror", "umbrella.identity.mirror"],
  ["/umbrella/crossworld/access", "umbrella.crossworld.access"],
  ["/umbrella/structural/truth/license", "structural.truth.license"],
];

for (const [path, type] of umbrellaRoutes) {
  app.post(path, async (c) =>
    umbrellaRequest(c.env, c.req.header("Authorization"), c.req.raw, type),
  );
}

app.post("/universe/tick", async (context) => {
  let payload: object = {};
  const contentType = context.req.header("Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return errorResponse(400, "INVALID_JSON", "Request body must be JSON");
    }

    if (!isRecord(body)) {
      return errorResponse(400, "INVALID_JSON", "Tick payload must be an object");
    }

    payload = body;
  }

  return normalizedRequest(context.env, context.req.header("Authorization"), "universe.tick", payload);
});

async function normalizedRequest(
  env: Bindings,
  authorization: string | undefined,
  type: string,
  payload: object,
): Promise<Response> {
  const identity = bearerToken(authorization);
  if (!identity) return unauthenticatedResponse();
  return kernelResponse(env, createEnvelope(type, payload, identity), true);
}

async function umbrellaRequest(
  env: Bindings,
  authorization: string | undefined,
  request: Request,
  type: UmbrellaOperation,
): Promise<Response> {
  const identity = bearerToken(authorization);
  if (!identity) return unauthenticatedResponse();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Umbrella payload must be JSON");
  }

  if (!isRecord(payload)) {
    return errorResponse(400, "INVALID_JSON", "Umbrella payload must be an object");
  }

  return kernelResponse(env, createEnvelope(type, payload, identity), true);
}

function createEnvelope(type: string, payload: object, identity: string): Envelope {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `env-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    payload,
    identity: {
      id: identity || "system",
      credential: identity,
      type: "user",
      authenticated: Boolean(identity),
      roles: ["user"],
      attributes: payload,
    },
    governanceContext: {
      umbrella: { allowed: true, policy: "planetary" },
      planetary: { allowed: true, policy: "planetary" },
      session: { allowed: true, policy: "session" },
    },
    metadata: {
      route: {
        entryId: type,
        lane: "sim" as Lane,
      },
    },
  };
}

async function kernelResponse(
  env: Bindings,
  envelope: Envelope,
  normalize = false,
): Promise<Response> {
  try {
    const engine = new KernelEngine({
      identity: envelope.identity.id,
      governanceContext: envelope.governanceContext,
      planetaryMode: "single",
      umbrellaEnforcement: "strict",
      storage: (env as unknown as { STORAGE?: DurableObjectStorage }).STORAGE as DurableObjectStorage,
    });

    const result = await engine.dispatch(envelope);
    const status = result.ok === false ? kernelErrorStatus(result.status) : 200;

    if (result.ok === false || !normalize) {
      return Response.json(result, { status });
    }

    return Response.json(normalizeResponse(result, envelope), { status });
  } catch (error) {
    console.error("Worker to kernel bridge failed", error);
    return errorResponse(503, "KERNEL_UNAVAILABLE", "Kernel bridge unavailable");
  }
}

function normalizeResponse(
  result: NormalizedKernelResponse,
  envelope: Envelope,
): Record<string, unknown> {
  if (!result.ok) return result as unknown as Record<string, unknown>;

  return {
    ok: true,
    data: result.data ?? {},
    meta: {
      lane: envelope.metadata?.route?.lane ?? "sim",
      identity: envelope.identity.id,
      governance: envelope.governanceContext,
    },
  };
}

function extractLaneData(response: unknown): unknown {
  if (!isRecord(response)) return {};
  if ("body" in response) return (response as { body?: unknown }).body;
  return {};
}

function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? "");
  return match?.[1]?.trim() || null;
}

function kernelErrorStatus(code: number | string | undefined): number {
  if (code === "UNAUTHENTICATED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "INVALID_MESSAGE" || code === "INVALID_JSON" || code === "ROUTE_NOT_FOUND") return 400;
  if (code === "INVARIANT_VIOLATION") return 422;
  return typeof code === "number" ? code : 500;
}

function unauthenticatedResponse(): Response {
  return errorResponse(401, "UNAUTHENTICATED", "Bearer token required");
}

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ ok: false, error: { code, message } }, { status });
}

export class PortalKernel {
  private readonly storage: DurableObjectStorage;

  constructor(
    state: DurableObjectState,
    env: Pick<Bindings, "PLANETARY_MODE" | "UMBRELLA_ENFORCEMENT">,
  ) {
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/api/kernel/message") {
      return new Response("Not Found", { status: 404 });
    }

    let envelope: unknown;
    try {
      envelope = await request.json();
    } catch {
      return errorResponse(400, "INVALID_JSON", "Kernel envelope must be JSON");
    }

    if (!isRecord(envelope)) {
      return errorResponse(400, "INVALID_MESSAGE", "Kernel envelope is missing required fields");
    }

    const engine = new KernelEngine({
      identity: (envelope as { identity?: { id?: string } }).identity?.id ?? "system",
      governanceContext: (envelope as { governanceContext?: object }).governanceContext ?? {},
      planetaryMode: "single",
      umbrellaEnforcement: "strict",
      storage: this.storage,
    });

    const result = await engine.dispatch(envelope as Envelope);
    return Response.json(result, { status: result.ok ? 200 : kernelErrorStatus(result.status) });
  }
}

export default app;
