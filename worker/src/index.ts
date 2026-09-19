import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { applyPatch, createPlanetaryState, type PlanetaryState, type StatePatch } from '../../substrate/planetary_state';
import { createSnapshot } from '../../substrate/snapshot';
import { synthesize } from '../../substrate/synthesis';
import { tick } from '../../kernel/tick';
import { stabilizeCurvature } from '../../governance/curvature';
import { quantumSignature } from '../../cognitive/quantum_signature';

export type UmbrellaState = { mode: 'enabled' | 'disabled' };
export type Bindings = {
  PLANETARY_MODE?: string;
  UMBRELLA_ENFORCEMENT?: string;
  KERNEL_SERVICE?: Fetcher;
  KERNEL_URL?: string;
  PLANETARY_MAX_SNAPSHOT: KVNamespace;
};
export type GlobalState = PlanetaryState & { umbrella: UmbrellaState; apex: { enforcement: boolean } };

const app = new Hono<{ Bindings: Bindings }>();
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type'] }));

const defaultUmbrella = (env: Bindings): UmbrellaState => ({
  mode: env.UMBRELLA_ENFORCEMENT === 'disabled' ? 'disabled' : 'enabled',
});

function applyUmbrellaToApex(currentState: GlobalState): GlobalState {
  return { ...currentState, apex: { ...currentState.apex, enforcement: currentState.umbrella.mode === 'enabled' } };
}

let state = applyUmbrellaToApex({ ...createPlanetaryState(), umbrella: { mode: 'enabled' }, apex: { enforcement: true } });
let lastTick = { state, physics: { gravity: 9.81, temperature: 20, collisions: 0 }, economy: { gdp: 1000, inflation: 0.02, production: 0 }, events: [] as string[] };
const json = (value: unknown) => value;

async function getUmbrella(env: Bindings): Promise<UmbrellaState> {
  const stored = await env.PLANETARY_MAX_SNAPSHOT.get('umbrella');
  if (!stored) return defaultUmbrella(env);
  try {
    const parsed = JSON.parse(stored) as Partial<UmbrellaState>;
    return { mode: parsed.mode === 'disabled' ? 'disabled' : 'enabled' };
  } catch {
    return defaultUmbrella(env);
  }
}

async function buildState(env: Bindings): Promise<GlobalState> {
  state = applyUmbrellaToApex({ ...state, umbrella: await getUmbrella(env) });
  return state;
}

app.get('/', c => c.json({ status: 'Portal-OS live', worker: 'planetary-max', mode: c.env.PLANETARY_MODE ?? 'production' }));
app.get('/health', c => c.json({ status: 'ok', service: 'portal-os-worker' }));
app.get('/api/status', async c => c.json({ status: 'online', mode: c.env.PLANETARY_MODE ?? 'production', umbrella: (await getUmbrella(c.env)).mode, worker: 'planetary-max', tick: state.tick }));
app.get('/api/state', async c => c.json(await buildState(c.env)));
app.post('/api/write', async c => { try { const patch = await c.req.json<StatePatch>(); state = applyUmbrellaToApex({ ...applyPatch(state, patch), umbrella: await getUmbrella(c.env), apex: state.apex }); return c.json({ ok: true, state }); } catch { return c.json({ ok: false, error: 'invalid patch' }, 400); } });
app.get('/api/snapshot', c => c.json(createSnapshot(state)));
app.get('/api/planet', c => c.json({ state, synthesis: synthesize(state) }));
app.get('/api/kernel', c => { lastTick = tick(state, lastTick.physics, lastTick.economy); state = applyUmbrellaToApex({ ...lastTick.state, umbrella: state.umbrella, apex: state.apex }); return c.json(lastTick); });
app.get('/api/umbrella', async c => { const umbrella = await getUmbrella(c.env); return c.json({ umbrella: umbrella.mode, ...umbrella, curvature: stabilizeCurvature(0), governed: true }); });
app.post('/api/umbrella', async c => {
  try {
    const body = await c.req.json<{ mode?: string }>();
    const mode: UmbrellaState['mode'] = body.mode === 'disabled' ? 'disabled' : 'enabled';
    const umbrella: UmbrellaState = { mode };
    await c.env.PLANETARY_MAX_SNAPSHOT.put('umbrella', JSON.stringify(umbrella));
    state = applyUmbrellaToApex({ ...state, umbrella });
    return c.json(umbrella);
  } catch {
    return c.json({ ok: false, error: 'invalid umbrella payload' }, 400);
  }
});
app.get('/api/quantum', c => c.json({ signature: quantumSignature([state.energy / 10000, state.population / 1000, state.tick / 100]), layer: 'MAX-Quantumn' }));
app.post('/api/kernel/message', c => c.json({ ok: true, message: 'Use the typed Portal-OS API surface' }));
export { app, json, applyUmbrellaToApex };
export default app;
