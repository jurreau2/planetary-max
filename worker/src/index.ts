import { Hono } from 'hono';

type Bindings = {
  PLANETARY_MODE: string;
  UMBRELLA_ENFORCEMENT: string;
  KERNEL_SERVICE?: Fetcher;
  KERNEL_URL?: string;
};

type KernelEnvelope = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  identity: string;
  governanceContext: Record<string, unknown>;
};

type KernelResult = { ok?: boolean; error?: { code?: string; message?: string }; [key: string]: unknown };
const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => c.json({ status: 'Portal-OS live', worker: 'planetary-max', mode: c.env.PLANETARY_MODE, umbrella: c.env.UMBRELLA_ENFORCEMENT }));
app.get('/health', (c) => c.json({ status: 'ok', service: 'portal-os-worker' }));

// Public telemetry endpoint consumed by the Pages UI.
app.get('/api/status', (c) => c.json({
  status: 'online',
  mode: c.env.PLANETARY_MODE,
  umbrella: c.env.UMBRELLA_ENFORCEMENT,
  worker: 'planetary-max',
}));

app.post('/api/kernel/message', async (c) => {
  const identity = bearerToken(c.req.header('Authorization'));
  if (!identity) return c.json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Bearer token required' } }, 401);
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ ok: false, error: { code: 'INVALID_JSON', message: 'Request body must be JSON' } }, 400); }
  if (!isRecord(body) || typeof body.type !== 'string' || (body.payload !== undefined && !isRecord(body.payload))) return c.json({ ok: false, error: { code: 'INVALID_MESSAGE', message: 'type and object payload are required' } }, 400);
  return kernelResponse(c.env, createEnvelope(body.type, body.payload ?? {}, identity, isRecord(body.governanceContext) ? body.governanceContext : {}));
});

async function kernelResponse(env: Bindings, envelope: KernelEnvelope): Promise<Response> {
  try { const response = await callKernel(env, envelope); const result = await response.json<KernelResult>(); return Response.json(result, { status: result.ok === false ? kernelErrorStatus(result.error?.code) : response.status }); }
  catch (error) { console.error('Worker to kernel bridge failed', error); return Response.json({ ok: false, error: { code: 'KERNEL_UNAVAILABLE', message: 'Kernel bridge unavailable' } }, { status: 503 }); }
}
async function callKernel(env: Bindings, envelope: KernelEnvelope): Promise<Response> {
  const body = JSON.stringify(envelope);
  if (env.KERNEL_SERVICE) return env.KERNEL_SERVICE.fetch(new Request('http://kernel/api/kernel/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }));
  if (env.KERNEL_URL) return fetch(`${env.KERNEL_URL.replace(/\/$/, '')}/api/kernel/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  throw new Error('Configure KERNEL_SERVICE or KERNEL_URL');
}
function createEnvelope(type: string, payload: Record<string, unknown>, identity: string, governanceContext: Record<string, unknown>): KernelEnvelope { return { id: crypto.randomUUID(), type, payload, identity, governanceContext }; }
function bearerToken(header: string | undefined): string | null { return /^Bearer\s+(.+)$/.exec(header ?? '')?.[1]?.trim() || null; }
function kernelErrorStatus(code: string | undefined): number { if (code === 'UNAUTHENTICATED') return 401; if (code === 'FORBIDDEN') return 403; if (code === 'INVALID_MESSAGE' || code === 'INVALID_JSON') return 400; return 500; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }

export { app, createEnvelope };
export default app;
