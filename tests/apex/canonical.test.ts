import assert from 'node:assert/strict';
import test from 'node:test';
import { deepFreeze } from '../../src/apex/canonical.ts';

test('deep freeze terminates safely for cyclic object graphs', () => {
  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  assert.equal(deepFreeze(cyclic), cyclic);
  assert.ok(Object.isFrozen(cyclic));
});
