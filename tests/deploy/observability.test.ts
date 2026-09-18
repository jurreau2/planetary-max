import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { createObservabilityEvent, isJsonValue, serializeObservabilityEvent } from '../../src/deploy/validation.ts';

test('observability events are deterministic', () => {
  const first = createObservabilityEvent(1, 'info', 'READY', { phase: '16' });
  const second = createObservabilityEvent(1, 'info', 'READY', { phase: '16' });
  assert.deepEqual(first, second);
});

test('observability serialization is normalized JSON', () => {
  const first = createObservabilityEvent(1, 'error', 'KERNEL_UNAVAILABLE', { retry: false, attempt: 2 });
  const second = createObservabilityEvent(1, 'error', 'KERNEL_UNAVAILABLE', { attempt: 2, retry: false });
  assert.equal(serializeObservabilityEvent(first), serializeObservabilityEvent(second));
});

test('observability rejects nondeterministic sequence inputs', () => {
  assert.throws(() => createObservabilityEvent(Number.NaN, 'info', 'READY', {}));
});

test('JSON validation rejects cycles without rejecting repeated references', () => {
  const shared = { stable: true };
  assert.equal(isJsonValue({ left: shared, right: shared }), true);
  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  assert.equal(isJsonValue(cyclic), false);
  assert.equal(isJsonValue(new Date(0)), false);
  const sparse: unknown[] = [];
  sparse.length = 1;
  assert.equal(isJsonValue(sparse), false);
});

test('production Worker has no console.log statements', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'index.ts'), 'utf8');
  assert.doesNotMatch(source, /console\.log\s*\(/);
});
