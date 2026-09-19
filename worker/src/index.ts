import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { applyPatch, createPlanetaryState, type StatePatch } from '../../substrate/planetary_state';
import { createSnapshot } from '../../substrate/snapshot';
import { synthesize } from '../../substrate/synthesis';
import { tick } from '../../kernel/tick';
import { stabilizeCurvature } from '../../governance/curvature';
import { quantumSignature } from '../../cognitive/quantum_signature';

export type Bindings = { PLANETARY_MODE?: string; UMBRELLA_ENFORCEMENT?: string; KERNEL_SERVICE?: Fetcher; KERNEL_URL?: string };
const app = new Hono<{ Bindings: Bindings }>();

// Handle CORS preflight requests and add CORS headers to all responses.
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

let state = createPlanetaryState();
let lastTick = { state, physics: { gravity: 9.81, temperature: 20, collisions: 0 }, economy: { gdp: 1000, inflation: 0.02, production: 0 }, events: [] as string[] };
const json = (value: unknown) => value;
app.get('/', c => c.json({ status: 'Portal-OS live', worker: 'planetary-max', mode: c.env.PLANETARY_MODE ?? 'production' }));
app.get('/health', c => c.json({ status: 'ok', service: 'portal-os-worker' }));
app.get('/api/status', c => c.json({ status: 'online', mode: c.env.PLANETARY_MODE ?? 'production', umbrella: c.env.UMBRELLA_ENFORCEMENT ?? 'enabled', worker: 'planetary-max', tick: state.tick }));
app.get('/api/state', c => c.json(state));
app.post('/api/write', async c => { try { const patch = await c.req.json<StatePatch>(); state = applyPatch(state, patch); return c.json({ ok: true, state }); } catch { return c.json({ ok: false, error: 'invalid patch' }, 400); } });
app.get('/api/snapshot', c => c.json(createSnapshot(state)));
app.get('/api/planet', c => c.json({ state, synthesis: synthesize(state) }));
app.get('/api/kernel', c => { lastTick = tick(state, lastTick.physics, lastTick.economy); state = lastTick.state; return c.json(lastTick); });
app.get('/api/umbrella', c => c.json({ enforcement: c.env.UMBRELLA_ENFORCEMENT ?? 'enabled', curvature: stabilizeCurvature(0), governed: true }));
app.get('/api/quantum', c => c.json({ signature: quantumSignature([state.energy / 10000, state.population / 1000, state.tick / 100]), layer: 'MAX-Quantumn' }));
app.post('/api/kernel/message', c => c.json({ ok: true, message: 'Use the typed Portal-OS API surface' }));
export { app, json };
export default app;
