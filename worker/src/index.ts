import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { applyPatch, createPlanetaryState, type PlanetaryState, type StatePatch } from '../../substrate/planetary_state';
import { createSnapshot } from '../../substrate/snapshot';
import { synthesize } from '../../substrate/synthesis';
import { tick } from '../../kernel/tick';
import { stabilizeCurvature } from '../../governance/curvature';
import { quantumSignature } from '../../cognitive/quantum_signature';

export type UmbrellaState = { mode: 'enabled' | 'disabled' };
export type UserRole = 'admin' | 'operator' | 'viewer';
export type Session = { id: string; user: string; role: UserRole; createdAt: string };
export type Bindings = {
  PLANETARY_MODE?: string;
  UMBRELLA_ENFORCEMENT?: string;
  KERNEL_SERVICE?: Fetcher;
  KERNEL_URL?: string;
  PLANETARY_MAX_SNAPSHOT: KVNamespace;
};
export type GlobalState = PlanetaryState & { umbrella: UmbrellaState; apex: { enforcement: boolean } };
type Variables = { user: Session };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization'] }));

const defaultUmbrella = (env: Bindings): UmbrellaState => ({ mode: env.UMBRELLA_ENFORCEMENT === 'disabled' ? 'disabled' : 'enabled' });

export function applyUmbrellaToApex(currentState: GlobalState): GlobalState {
  return { ...currentState, apex: { ...currentState.apex, enforcement: currentState.umbrella.mode === 'enabled' } };
}

let state = applyUmbrellaToApex({ ...createPlanetaryState(), umbrella: { mode: 'enabled' }, apex: { enforcement: true } });
let lastTick = { state, physics: { gravity: 9.81, temperature: 20, collisions: 0 }, economy: { gdp: 1000, inflation: 0.02, production: 0 }, events: [] as string[] };
const json = (value: unknown) => value;

async function getUmbrella(env: Bindings): Promise<UmbrellaState> {
  const stored = await env.PLANETARY_MAX_SNAPSHOT.get('umbrella');
  if (!stored) return defaultUmbrella(env);
  const parsed = JSON.parse(stored) as Partial<UmbrellaState>;
  return { mode: parsed.mode === 'disabled' ? 'disabled' : 'enabled' };
}

async function buildState(env: Bindings): Promise<GlobalState> {
  return applyUmbrellaToApex({ ...state, umbrella: await getUmbrella(env) });
}

async function readSession(env: Bindings, token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const stored = await env.PLANETARY_MAX_SNAPSHOT.get(`session:${token}`);
  if (!stored) return null;
  try { return JSON.parse(stored) as Session; } catch { return null; }
}

const authMiddleware = async (c: any, next: () => Promise<void>) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
  const session = await readSession(c.env, token);
  if (!session) return c.json({ error: 'Authentication required' }, 401);
  c.set('user', session);
  await next();
};

app.get('/', c => c.json({ status: 'Portal-OS live', worker: 'planetary-max', mode: c.env.PLANETARY_MODE ?? 'production' }));
app.get('/health', c => c.json({ status: 'ok', service: 'portal-os-worker' }));
app.get('/api/status', async c => c.json({ status: 'online', mode: c.env.PLANETARY_MODE ?? 'production', umbrella: (await getUmbrella(c.env)).mode, worker: 'planetary-max', tick: state.tick }));

app.get('/api/auth/status', async c => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
  const session = await readSession(c.env, token);
  return c.json(session ? { authenticated: true, user: session.user, role: session.role } : { authenticated: false });
});
app.post('/api/auth/login', async c => {
  try {
    const body = await c.req.json<{ username?: string; password?: string }>();
    const username = body.username?.trim();
    if (username !== 'admin' || body.password !== 'admin') return c.json({ error: 'Invalid username or password' }, 401);
    const token = crypto.randomUUID();
    const session: Session = { id: token, user: username, role: 'admin', createdAt: new Date().toISOString() };
    await c.env.PLANETARY_MAX_SNAPSHOT.put(`session:${token}`, JSON.stringify(session));
    return c.json({ token, user: session.user, role: session.role });
  } catch { return c.json({ error: 'invalid login payload' }, 400); }
});
app.post('/api/auth/logout', async c => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
  if (token) await c.env.PLANETARY_MAX_SNAPSHOT.delete(`session:${token}`);
  return c.json({ ok: true });
});

for (const route of ['/api/state', '/api/planet', '/api/planetary', '/api/kernel', '/api/umbrella', '/api/quantum']) app.use(route, authMiddleware);
app.get('/api/state', async c => c.json(await buildState(c.env)));
app.post('/api/write', async c => { try { const patch = await c.req.json<StatePatch>(); state = applyUmbrellaToApex({ ...applyPatch(state, patch), umbrella: await getUmbrella(c.env), apex: state.apex }); return c.json({ ok: true, state }); } catch { return c.json({ ok: false, error: 'invalid patch' }, 400); } });
app.get('/api/snapshot', c => c.json(createSnapshot(state)));
app.get('/api/planet', async c => { const current = await buildState(c.env); return c.json({ state: current, synthesis: synthesize(current) }); });
app.get('/api/planetary', async c => { const current = await buildState(c.env); return c.json({ state: current, synthesis: synthesize(current) }); });
app.get('/api/kernel', async c => { lastTick = tick(state, lastTick.physics, lastTick.economy); state = applyUmbrellaToApex({ ...lastTick.state, umbrella: await getUmbrella(c.env), apex: state.apex }); return c.json({ ...lastTick, state }); });
app.get('/api/umbrella', async c => { try { return c.json(await getUmbrella(c.env)); } catch { return c.json({ error: 'Unable to read Umbrella state' }, 503); } });
app.post('/api/umbrella', async c => { try { const body = await c.req.json<{ mode?: string }>(); if (body.mode !== 'enabled' && body.mode !== 'disabled') return c.json({ error: 'mode must be enabled or disabled' }, 400); const umbrella: UmbrellaState = { mode: body.mode }; await c.env.PLANETARY_MAX_SNAPSHOT.put('umbrella', JSON.stringify(umbrella)); await c.env.PLANETARY_MAX_SNAPSHOT.put(`umbrella:${umbrella.mode}`, JSON.stringify(umbrella)); state = applyUmbrellaToApex({ ...state, umbrella }); return c.json(umbrella); } catch { return c.json({ error: 'Unable to persist Umbrella state' }, 503); } });
app.get('/api/quantum', c => c.json({ signature: quantumSignature([state.energy / 10000, state.population / 1000, state.tick / 100]), layer: 'MAX-Quantumn' }));
app.post('/api/kernel/message', c => c.json({ ok: true, message: 'Use the typed Portal-OS API surface' }));
export { app, json };
export default app;
