import assert from 'node:assert/strict';
import test from 'node:test';
import { writeD1Metadata } from '../../src/bindings/d1.ts';
import { writeKvSnapshot } from '../../src/bindings/kv.ts';
import { readAuthoritativeState, writeAuthoritativeState } from '../../src/bindings/r2.ts';
import { FENCE } from '../apex/fixtures.ts';
import { MemoryD1, MemoryKv, MemoryR2 } from './fixtures.ts';

test('R2 rejects an expired writer fence', async () => {
  await assert.rejects(() => writeAuthoritativeState(
    new MemoryR2(),
    { stateKey: 'planet', fence: FENCE - 1, value: true },
    FENCE,
  ), /fence mismatch/);
});

test('KV rejects an expired snapshot fence', async () => {
  await assert.rejects(() => writeKvSnapshot(
    new MemoryKv(),
    { stateKey: 'planet', sourceDigest: 'r2', fence: FENCE - 1, value: true },
    FENCE,
  ), /fence mismatch/);
});

test('D1 rejects an expired metadata fence', async () => {
  await assert.rejects(() => writeD1Metadata(
    new MemoryD1(),
    { recordId: 'planet', fence: FENCE - 1, metadata: {} },
    FENCE,
  ), /fence mismatch/);
});

test('R2 chooses the highest completed fence deterministically', async () => {
  const bucket = new MemoryR2();
  await writeAuthoritativeState(bucket, { stateKey: 'planet', fence: FENCE, value: 'old' }, FENCE);
  await writeAuthoritativeState(bucket, { stateKey: 'planet', fence: FENCE + 1, value: 'new' }, FENCE + 1);
  assert.equal((await readAuthoritativeState(bucket, 'planet'))?.value, 'new');
});

test('R2 rejects conflicting values at the same fence', async () => {
  const bucket = new MemoryR2();
  await writeAuthoritativeState(bucket, { stateKey: 'planet', fence: FENCE, value: 'left' }, FENCE);
  await writeAuthoritativeState(bucket, { stateKey: 'planet', fence: FENCE, value: 'right' }, FENCE);
  await assert.rejects(() => readAuthoritativeState(bucket, 'planet'), /fence conflict/);
});
