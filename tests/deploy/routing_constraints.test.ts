import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { app } from '../../src/index.ts';
import { resolveKernelRoute, validateRoutingConstraints } from '../../src/deploy/routes.ts';
import { readyEnv } from './fixtures.ts';

test('Worker source has no local health or root route', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'index.ts'), 'utf8');
  assert.doesNotMatch(source, /app\.(?:get|post|all)\(\s*['"]\/health['"]/);
  assert.doesNotMatch(source, /app\.get\(\s*['"]\/['"]/);
});

test('Worker has no URL-based kernel fallback', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'index.ts'), 'utf8');
  assert.doesNotMatch(source, /KERNEL_URL|fetch\(target/);
  assert.match(source, /KERNEL_SERVICE\.fetch/);
});

test('route resolution is deterministic and governance constrained', () => {
  const first = resolveKernelRoute('GET', '/universe/state');
  const second = resolveKernelRoute('get', '/universe/state');
  assert.deepEqual(first, second);
  assert.equal(first.destination, 'kernel');
  assert.equal(first.apexGovernanceRequired, true);
});

test('routing validator rejects duplicate route identifiers', () => {
  const route = resolveKernelRoute('GET', '/universe/state');
  assert.match(validateRoutingConstraints([route, route]).join(' '), /Duplicate/);
});

test('unknown routes are forwarded through the kernel bridge', async () => {
  let calls = 0;
  const env = readyEnv({
    fetch: async () => {
      calls += 1;
      return Response.json({ ok: true, route: 'kernel' });
    },
  });
  const response = await app.request('https://portal.example/unknown', { headers: { Authorization: 'Bearer identity' } }, env);
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
});

test('universe tick preserves its payload at the kernel envelope root', async () => {
  let envelope: unknown;
  const env = readyEnv({
    fetch: async (request) => {
      envelope = await request.json();
      return Response.json({ ok: true });
    },
  });
  const response = await app.request('https://portal.example/universe/tick', {
    method: 'POST',
    headers: { Authorization: 'Bearer identity', 'Content-Type': 'application/json' },
    body: JSON.stringify({ lane: 'SIM', sequence: 3 }),
  }, env);
  assert.equal(response.status, 200);
  assert.deepEqual((envelope as { readonly payload: unknown }).payload, { lane: 'SIM', sequence: 3 });
});

test('local health path is unavailable without touching the kernel', async () => {
  let calls = 0;
  const env = readyEnv({ fetch: async () => { calls += 1; return Response.json({ ok: true }); } });
  const response = await app.request('https://portal.example/health', { headers: { Authorization: 'Bearer identity' } }, env);
  assert.equal(response.status, 404);
  assert.equal(calls, 0);
});
