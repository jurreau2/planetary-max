import assert from 'node:assert/strict';
import test from 'node:test';
import { tombstoneD1Metadata, writeD1Metadata } from '../../src/bindings/d1.ts';
import { readKvSnapshot, writeKvSnapshot } from '../../src/bindings/kv.ts';
import { readAuthoritativeState, writeAuthoritativeState } from '../../src/bindings/r2.ts';
import { FENCE } from '../apex/fixtures.ts';
import { MemoryD1, MemoryKv, MemoryR2 } from './fixtures.ts';

test('R2 stores and reads authoritative state', async () => {
  const bucket = new MemoryR2();
  await writeAuthoritativeState(bucket, { stateKey: 'planet', fence: FENCE, value: { status: 'stable' } }, FENCE);
  const state = await readAuthoritativeState(bucket, 'planet');
  assert.equal(state?.value && typeof state.value === 'object' ? state.value.status : undefined, 'stable');
});

test('R2 authoritative writes are idempotent', async () => {
  const bucket = new MemoryR2();
  const input = { stateKey: 'planet', fence: FENCE, value: { status: 'stable' } } as const;
  await writeAuthoritativeState(bucket, input, FENCE);
  await writeAuthoritativeState(bucket, input, FENCE);
  assert.equal(bucket.putCount, 1);
});

test('R2 snapshots mutable input before awaiting the bucket', async () => {
  const bucket = new MemoryR2();
  let resumeHead: () => void = () => undefined;
  const headGate = new Promise<void>((resolve) => { resumeHead = resolve; });
  bucket.head = async () => { await headGate; return null; };
  const value = { status: 'stable' };
  const pending = writeAuthoritativeState(bucket, { stateKey: 'planet', fence: FENCE, value }, FENCE);
  value.status = 'mutated';
  resumeHead();
  const state = await pending;
  assert.deepEqual(state.value, { status: 'stable' });
  assert.equal(Object.isFrozen(state.value), true);
  const stored = [...bucket.objects.values()][0];
  assert.equal((JSON.parse(stored) as { value: { status: string } }).value.status, 'stable');
});

test('R2 rejects a body whose digest does not match its immutable object key', async () => {
  const bucket = new MemoryR2();
  await writeAuthoritativeState(bucket, { stateKey: 'planet', fence: FENCE, value: { status: 'stable' } }, FENCE);
  const [originalKey] = bucket.objects.keys();
  const body = bucket.objects.get(originalKey);
  assert.notEqual(body, undefined);
  const forgedKey = originalKey.replace(/[a-f0-9]{16}\.json$/, '0000000000000000.json');
  bucket.objects.clear();
  bucket.objects.set(forgedKey, body as string);
  await assert.rejects(() => readAuthoritativeState(bucket, 'planet'), /integrity mismatch/);
});

test('R2 recursively freezes authoritative state read from storage', async () => {
  const bucket = new MemoryR2();
  await writeAuthoritativeState(bucket, { stateKey: 'planet', fence: FENCE, value: { nested: { stable: true } } }, FENCE);
  const state = await readAuthoritativeState(bucket, 'planet');
  assert.notEqual(state, null);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state?.value), true);
  assert.equal(Object.isFrozen((state?.value as { nested: object }).nested), true);
});

test('KV records are explicitly snapshot-only', async () => {
  const namespace = new MemoryKv();
  const snapshot = await writeKvSnapshot(namespace, {
    stateKey: 'planet',
    sourceDigest: 'r2-digest',
    fence: FENCE,
    value: { status: 'stable' },
  }, FENCE);
  assert.equal(snapshot.authoritative, false);
  assert.deepEqual(await readKvSnapshot(namespace, 'planet', FENCE), snapshot);
});

test('D1 metadata writes are deterministic and fenced', async () => {
  const firstDatabase = new MemoryD1();
  const secondDatabase = new MemoryD1();
  const input = { recordId: 'planet', fence: FENCE, metadata: { source: 'r2' } } as const;
  await writeD1Metadata(firstDatabase, input, FENCE);
  await writeD1Metadata(secondDatabase, input, FENCE);
  assert.deepEqual(firstDatabase.executions[0], secondDatabase.executions[0]);
});

test('D1 rejects writes that do not advance the stored fence', async () => {
  const database = new MemoryD1(0);
  await assert.rejects(
    () => writeD1Metadata(database, { recordId: 'planet', fence: FENCE, metadata: { source: 'r2' } }, FENCE),
    /active fence/,
  );
});

test('D1 removal is represented by a tombstone', async () => {
  const database = new MemoryD1();
  await tombstoneD1Metadata(database, { recordId: 'planet', fence: FENCE, metadata: { reason: 'retired' } }, FENCE);
  assert.match(database.executions[0].query, /"tombstoned" = 1/);
  assert.doesNotMatch(database.executions[0].query, /\bDELETE\b/);
});
