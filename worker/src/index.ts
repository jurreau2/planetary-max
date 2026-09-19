import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { applyPatch, createPlanetaryState, type PlanetaryState, type StatePatch } from '../../substrate/planetary_state';
import { createSnapshot } from '../../substrate/snapshot';
import { synthesize } from '../../substrate/synthesis';
import { tick as kernelTick, type TickResult } from '../../kernel/tick';
import { quantumSignature, type QuantumSignature } from '../../cognitive/quantum_signature';

export type UmbrellaState = { mode: 'enabled' | 'disabled' };
export type UserRole = 'admin' | 'operator' | 'viewer';
export type Session = { id: string; user: string; role: UserRole; createdAt: string };
export type Bindings = { PLANETARY_MODE?: string; UMBRELLA_ENFORCEMENT?: string; KERNEL_SERVICE?: Fetcher; KERNEL_URL?: string; PLANETARY_MAX_SNAPSHOT: KVNamespace };
export type GlobalState = PlanetaryState & { umbrella: UmbrellaState; apex: { enforcement: boolean } };
type Variables = { user: Session };
type KernelState = Omit<TickResult, 'state'> & { state: PlanetaryState };
type SimResult = { tick: number; state: GlobalState; kernel: KernelState; planetary: GlobalState; quantum: QuantumSignature; events: string[] };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization'] }));

const defaultUmbrella = (env: Bindings): UmbrellaState => ({ mode: env.UMBRELLA_ENFORCEMENT === 'disabled' ? 'disabled' : 'enabled' });
export function applyUmbrellaToApex(currentState: GlobalState): GlobalState { return { ...currentState, apex: { ...currentState.apex, enforcement: currentState.umbrella.mode === 'enabled' } }; }

let state = applyUmbrellaToApex({ ...createPlanetaryState(), umbrella: { mode: 'enabled' }, apex: { enforcement: true } });
let lastTick: KernelState = { state, physics: { gravity: 9.81, temperature: 20, collisions: 0 }, economy: { gdp: 1000, inflation: 0.02, production: 0 }, events: [] };
const json = (value: unknown) => value;

async function getUmbrella(env: Bindings): Promise<UmbrellaState> { const stored = await env.PLANETARY_MAX_SNAPSHOT.get('umbrella'); if (!stored) return defaultUmbrella(env); const parsed = JSON.parse(stored) as Partial<UmbrellaState>; return { mode: parsed.mode === 'disabled' ? 'disabled' : 'enabled' }; }
async function buildState(env: Bindings): Promise<GlobalState> { state = applyUmbrellaToApex({ ...state, umbrella: await getUmbrella(env) }); return state; }
async function readSession(env: Bindings, token: string | undefined): Promise<Session | null> { if (!token) return null; const stored = await env.PLANETARY_MAX_SNAPSHOT.get(`session:${token}`); if (!stored) return null; try { return JSON.parse(stored) as Session; } catch { return null; } }
const authMiddleware = async (c: any, next: () => Promise<void>) => { const header = c.req.header('Authorization'); const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined; const session = await readSession(c.env, token); if (!session) return c.json({ error: 'Authentication required' }, 401); c.set('user', session); await next(); };

function quantumFor(current: GlobalState): QuantumSignature { return quantumSignature([current.energy / 10000, current.population / 1000, current.tick / 100]); }

function planetaryStep(current: GlobalState, kernel: KernelState, quantum: QuantumSignature): GlobalState {
  const governance = current.apex.enforcement ? 1 : 0.25;
  const coherence = quantum.coherence;
  const anomaly = (quantum.basis[0] ?? 0) * 0.5;
  const regions = Object.fromEntries(Object.entries(current.regions).map(([name, region]) => [name, { ...region, production: Math.max(0, region.production + kernel.economy.production * 0.01), stability: Math.max(0, Math.min(1, region.stability + (current.apex.enforcement ? 0.01 : -0.02) + coherence * 0.005)) }]));
  const stabilityValues = Object.values(regions).map(region => region.stability);
  const stability = stabilityValues.length ? stabilityValues.reduce((sum, value) => sum + value, 0) / stabilityValues.length : 0;
  const resources = current.resources;
  const resourceFactor = Math.max(0, (resources.food + resources.water + resources.minerals) / 10000);
  const births = current.population * 0.002 * stability * resourceFactor;
  const deaths = current.population * 0.001 * (1 / Math.max(stability, 0.01));
  const governanceFactor = current.umbrella.mode === 'enabled' ? 0.01 : -0.02;
  const migration = (stability - 1) * 10;
  const quantumDelta = coherence * 5 + anomaly;
  const populationDelta = births - deaths + migration + (governanceFactor * current.population) + quantumDelta;
  const population = Math.max(0, Math.floor(current.population + populationDelta));
  const foodDelta = Math.round(kernel.economy.production * 0.1 * governance - current.population * 0.01);
  const energyDelta = Math.round(kernel.economy.production * governance + coherence * 5);
  const regionPopulationTotal = Object.values(regions).reduce((sum, region) => sum + region.population, 0);
  const populationRatio = regionPopulationTotal > 0 ? population / regionPopulationTotal : 1;
  const balancedRegions = Object.fromEntries(Object.entries(regions).map(([name, region]) => [name, { ...region, population: Math.max(0, Math.floor(region.population * populationRatio)) }]));
  return applyUmbrellaToApex({ ...current, tick: kernel.state.tick, updatedAt: new Date().toISOString(), population, energy: Math.max(0, current.energy + energyDelta), resources: { ...resources, food: Math.max(0, resources.food + foodDelta) }, regions: balancedRegions, events: [...current.events, ...kernel.events, `population:births=${Math.floor(births)},deaths=${Math.floor(deaths)},migration=${migration.toFixed(2)}`, `quantum:${quantum.hash}`].slice(-100) });
}

async function runSimulation(env: Bindings): Promise<SimResult> {
  const current = await buildState(env);
  const quantum = quantumFor(current);
  const governedPhysics = { ...lastTick.physics, gravity: lastTick.physics.gravity * (current.apex.enforcement ? 1 : 0.98) };
  const kernel = kernelTick(current, governedPhysics, { ...lastTick.economy, production: lastTick.economy.production * (current.apex.enforcement ? 1 : 0.25) });
  const planetary = planetaryStep(current, { ...kernel, state: kernel.state }, quantum);
  state = planetary;
  lastTick = { ...kernel, state: planetary };
  const snapshot = createSnapshot(planetary);
  await Promise.all([
    env.PLANETARY_MAX_SNAPSHOT.put('state', JSON.stringify(planetary)),
    env.PLANETARY_MAX_SNAPSHOT.put('kernel', JSON.stringify(lastTick)),
    env.PLANETARY_MAX_SNAPSHOT.put('planetary', JSON.stringify(planetary)),
    env.PLANETARY_MAX_SNAPSHOT.put('quantum', JSON.stringify(quantum)),
    env.PLANETARY_MAX_SNAPSHOT.put('snapshot', JSON.stringify(snapshot)),
  ]);
  return { tick: planetary.tick, state: planetary, kernel: lastTick, planetary, quantum, events: planetary.events.slice(-20) };
}

app.get('/', c => c.json({ status: 'Portal-OS live', worker: 'planetary-max', mode: c.env.PLANETARY_MODE ?? 'production' }));
app.get('/health', c => c.json({ status: 'ok', service: 'portal-os-worker' }));
app.get('/api/status', async c => c.json({ status: 'online', mode: c.env.PLANETARY_MODE ?? 'production', umbrella: (await getUmbrella(c.env)).mode, worker: 'planetary-max', tick: state.tick }));
app.get('/api/auth/status', async c => { const header = c.req.header('Authorization'); const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined; const session = await readSession(c.env, token); return c.json(session ? { authenticated: true, user: session.user, role: session.role } : { authenticated: false }); });
app.post('/api/auth/login', async c => { try { const body = await c.req.json<{ username?: string; password?: string }>(); if (body.username?.trim() !== 'admin' || body.password !== 'admin') return c.json({ error: 'Invalid username or password' }, 401); const token = crypto.randomUUID(); const session: Session = { id: token, user: 'admin', role: 'admin', createdAt: new Date().toISOString() }; await c.env.PLANETARY_MAX_SNAPSHOT.put(`session:${token}`, JSON.stringify(session)); return c.json({ token, user: session.user, role: session.role }); } catch { return c.json({ error: 'invalid login payload' }, 400); } });
app.post('/api/auth/logout', async c => { const header = c.req.header('Authorization'); const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined; if (token) await c.env.PLANETARY_MAX_SNAPSHOT.delete(`session:${token}`); return c.json({ ok: true }); });

for (const route of ['/api/state', '/api/planet', '/api/planetary', '/api/kernel', '/api/umbrella', '/api/quantum', '/api/sim/tick']) app.use(route, authMiddleware);
app.get('/api/state', async c => c.json(await buildState(c.env)));
app.post('/api/write', async c => { try { const patch = await c.req.json<StatePatch>(); state = applyUmbrellaToApex({ ...applyPatch(state, patch), umbrella: await getUmbrella(c.env), apex: state.apex }); return c.json({ ok: true, state }); } catch { return c.json({ ok: false, error: 'invalid patch' }, 400); } });
app.get('/api/snapshot', c => c.json(createSnapshot(state)));
app.get('/api/planet', async c => { const current = await buildState(c.env); return c.json({ state: current, synthesis: synthesize(current) }); });
app.get('/api/planetary', async c => { const current = await buildState(c.env); return c.json({ state: current, synthesis: synthesize(current) }); });
app.get('/api/kernel', async c => { const result = await runSimulation(c.env); return c.json(result.kernel); });
app.get('/api/umbrella', async c => { try { return c.json(await getUmbrella(c.env)); } catch { return c.json({ error: 'Unable to read Umbrella state' }, 503); } });
app.post('/api/umbrella', async c => { try { const body = await c.req.json<{ mode?: string }>(); if (body.mode !== 'enabled' && body.mode !== 'disabled') return c.json({ error: 'mode must be enabled or disabled' }, 400); const umbrella: UmbrellaState = { mode: body.mode }; await c.env.PLANETARY_MAX_SNAPSHOT.put('umbrella', JSON.stringify(umbrella)); await c.env.PLANETARY_MAX_SNAPSHOT.put(`umbrella:${umbrella.mode}`, JSON.stringify(umbrella)); state = applyUmbrellaToApex({ ...state, umbrella }); return c.json(umbrella); } catch { return c.json({ error: 'Unable to persist Umbrella state' }, 503); } });
app.get('/api/quantum', c => c.json(quantumFor(state)));
app.post('/api/sim/tick', async c => { try { return c.json(await runSimulation(c.env)); } catch { return c.json({ error: 'Simulation tick failed' }, 503); } });
app.post('/api/kernel/message', c => c.json({ ok: true, message: 'Use the typed Portal-OS API surface' }));
export { app, json };
export default app;
