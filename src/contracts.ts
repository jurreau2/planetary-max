import { Hono } from "hono";
import { cors } from "hono/cors";

import type { Bindings, KernelEnvelope, KernelResult } from "./types";
import { isRecord } from "./contracts";

type JsonObject = Record<string, unknown>;

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

function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value);
}

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

app.get("/", (c) => c.json({
  status: "Portal-OS live",
  worker: "planetary-max",
  mode: c.env.PLANETARY_MODE,
  umbrella: c.env.UMBRELLA_ENFORCEMENT,
}));

app.get("/health", (context) => context.json({ status: "ok", service: "planetary-max" }));

app.post("/api/kernel/message", async (c) => {
  const identity = bearerToken(c.req.header("Authorization"));
  if (!identity) return unauthenticatedResponse();

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be JSON");
  }

  if (!isRecord(body) || typeof body.type !== "string") {
    return errorResponse(400, "INVALID_MESSAGE", "type and object payload are required");
  }

  const payload = body.payload === undefined ? {} : body.payload;
  if (!isRecord(payload)) {
    return errorResponse(400, "INVALID_MESSAGE", "type and object payload are required");
  }

  const envelope = createEnvelope(
    typeof body.type === "string" ? body.type : "kernel.message",
    payload as JsonObject,
    identity,
    isJsonObject(body.governanceContext) ? body.governanceContext : {},
  );

  return kernelResponse(c.env, envelope);
});

app.post("/os/kernel/message", async (context) => {
  const identity = bearerToken(context.req.header("Authorization"));
  if (!identity) return unauthenticatedResponse();

  const payload: JsonObject = {};
  return kernelResponse(context.env, createEnvelope("os.kernel.message", payload, identity, { surface: "worker-api" }), true);
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
  app.post(path, async (c) => umbrellaRequest(c.env, c.req.header("Authorization"), c.req.raw, type));
}

app.post("/universe/tick", async (context) => {
  let payload: JsonObject = {};
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
    if (!isJsonObject(body)) return invalidJson("Tick payload must be an object");
    payload = body as JsonObject;
  }

  return normalizedRequest(context.env, context.req.header("Authorization"), "universe.tick", payload);
});

async function normalizedRequest(
  env: Bindings,
  authorization: string | undefined,
  type: string,
  payload: JsonObject,
): Promise<Response> {
  const identity = bearerToken(authorization);
  if (!identity) return unauthenticatedResponse();
  return kernelResponse(env, createEnvelope(type, payload, identity, { surface: "worker-api" }), true);
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

  return kernelResponse(env, createEnvelope(type, payload as JsonObject, identity, { surface: "worker-umbrella" }), true);
}

export function createEnvelope(
  type: string,
  payload: JsonObject,
  identity: string,
  governanceContext: JsonObject = {},
): KernelEnvelope {
  return {
    lane: "sim",
    payload,
    identity,
    governance: {
      mode: "strict",
      decision: "allow",
      reason: type,
    },
  };
}

async function kernelResponse(
  env: Bindings,
  envelope: KernelEnvelope,
  normalize = false,
): Promise<Response> {
  try {
    const response = await fetchFromKernel(env, envelope);
    const result = await response.json<KernelResult>();
    const status = result.ok === false ? kernelErrorStatus(result.status) : response.status;

    if (result.ok === false || !normalize) {
      return Response.json(result, { status });
    }

    return Response.json(normalizeResponse(result, envelope), { status });
  } catch (error) {
    console.error("Worker to kernel bridge failed", error);
    return errorResponse(503, "KERNEL_UNAVAILABLE", "Kernel bridge unavailable");
  }
}

async function fetchFromKernel(env: Bindings, envelope: KernelEnvelope): Promise<Response> {
  const kernelUrl = typeof env.KERNEL_URL === "string" ? env.KERNEL_URL : "/api/kernel/message";
  return fetch(kernelUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lane: envelope.lane,
      payload: envelope.payload,
      identity: envelope.identity,
      governance: envelope.governance,
    }),
  });
}

export function normalizeResponse(result: KernelResult, envelope: KernelEnvelope): Record<string, unknown> {
  if (!result.ok) return result as unknown as Record<string, unknown>;

  return {
    ok: true,
    data: result.body ?? {},
    meta: {
      lane: envelope.lane,
      identity: result.identity ?? envelope.identity,
      governance: result.governance ?? envelope.governance,
      status: result.status,
    },
  };
}

export function extractLaneData(response: unknown): unknown {
  if (!isRecord(response)) return {};
  if ("body" in response && response.body !== undefined) return response.body;
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

export default app;

export { app, createEnvelope, extractLaneData, normalizeResponse };
