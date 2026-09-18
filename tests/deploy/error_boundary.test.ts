import assert from 'node:assert/strict';
import test from 'node:test';
import { app } from '../../src/index.ts';
import { executeFailClosed, normalizeKernelError } from '../../src/deploy/validation.ts';
import { readyEnv } from './fixtures.ts';

test('unauthenticated requests are normalized and never reach the kernel', async () => {
  let calls = 0;
  const env = readyEnv({ fetch: async () => { calls += 1; return Response.json({ ok: true }); } });
  const response = await app.request('https://portal.example/universe/state', undefined, env);
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
  assert.equal((await response.json()).error.code, 'UNAUTHENTICATED');
});

test('kernel failures produce a normalized unavailable error', async () => {
  const original = console.error;
  console.error = () => undefined;
  try {
    const env = readyEnv({ fetch: async () => { throw new Error('offline'); } });
    const response = await app.request('https://portal.example/universe/state', { headers: { Authorization: 'Bearer identity' } }, env);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'KERNEL_UNAVAILABLE');
  } finally {
    console.error = original;
  }
});

test('malformed kernel errors are rejected at the bridge boundary', async () => {
  const original = console.error;
  console.error = () => undefined;
  try {
    const env = readyEnv({ fetch: async () => Response.json({ ok: false, error: 'internal details' }) });
    const response = await app.request('https://portal.example/universe/state', {
      headers: { Authorization: 'Bearer identity' },
    }, env);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: { code: 'KERNEL_UNAVAILABLE', message: 'Kernel bridge unavailable' },
    });
  } finally {
    console.error = original;
  }
});

test('invalid JSON is rejected before kernel mutation', async () => {
  let calls = 0;
  const env = readyEnv({ fetch: async () => { calls += 1; return Response.json({ ok: true }); } });
  const response = await app.request('https://portal.example/universe/tick', {
    method: 'POST',
    headers: { Authorization: 'Bearer identity', 'Content-Type': 'application/json' },
    body: '{',
  }, env);
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test('typed kernel messages require an object payload', async () => {
  let calls = 0;
  const env = readyEnv({ fetch: async () => { calls += 1; return Response.json({ ok: true }); } });
  const response = await app.request('https://portal.example/api/kernel/message', {
    method: 'POST',
    headers: { Authorization: 'Bearer identity', 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'universe.tick' }),
  }, env);
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
  assert.equal((await response.json()).error.code, 'INVALID_MESSAGE');
});

test('kernel messages parse JSON without relying on Content-Type', async () => {
  let envelope: unknown;
  const env = readyEnv({
    fetch: async (request) => {
      envelope = await request.json();
      return Response.json({ ok: true });
    },
  });
  const response = await app.request('https://portal.example/api/kernel/message', {
    method: 'POST',
    headers: { Authorization: 'Bearer identity' },
    body: JSON.stringify({ type: 'universe.tick', payload: { sequence: 4 } }),
  }, env);
  assert.equal(response.status, 200);
  assert.deepEqual((envelope as { readonly payload: unknown }).payload, { sequence: 4 });
});

test('error normalization clamps invalid HTTP status values', () => {
  assert.equal(normalizeKernelError('ERROR', 'failed', 200).status, 500);
});

test('fail-closed execution never returns stale success', async () => {
  await assert.rejects(() => executeFailClosed(async () => { throw new Error('failed'); }), /failed closed/);
});
