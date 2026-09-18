import assert from 'node:assert/strict';
import test from 'node:test';
import { propagateIdentity } from '../../src/apex/routing/identity_propagation.ts';
import { FENCE, governance, stableCurvature } from './fixtures.ts';

test('identity propagation orders and deduplicates targets', () => {
  const result = propagateIdentity(stableCurvature(), 'u-a', ['u-c', 'u-b', 'u-c'], governance(['identity.propagate']), FENCE);
  assert.deepEqual(result.map((item) => item.targetUniverse), ['u-b', 'u-c']);
});

test('identity propagation is deterministic across invocations', () => {
  const grant = governance(['identity.propagate']);
  assert.deepEqual(
    propagateIdentity(stableCurvature(), 'u-a', ['u-b'], grant, FENCE),
    propagateIdentity(stableCurvature('session-b'), 'u-a', ['u-b'], grant, FENCE),
  );
});

test('identity propagation rejects unstable curvature', () => {
  assert.throws(() => propagateIdentity({ ...stableCurvature(), stable: false }, 'u-a', ['u-b'], governance(['identity.propagate']), FENCE));
});

test('identity propagation cannot target its source universe', () => {
  assert.throws(() => propagateIdentity(stableCurvature(), 'u-a', ['u-a'], governance(['identity.propagate']), FENCE));
});

test('identity propagation binds curvature identity to governance subject', () => {
  const curvature = stableCurvature('session-a', FENCE, 'u-a', 'identity-2');
  assert.throws(() => propagateIdentity(curvature, 'u-a', ['u-b'], governance(['identity.propagate']), FENCE), /governance subject/);
});
