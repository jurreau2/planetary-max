import assert from 'node:assert/strict';
import test from 'node:test';
import { assertSameIdentity, deriveIdentityCurvature } from '../../src/apex/identity/quantum_curvature.ts';

test('identity curvature is deterministic', () => {
  assert.deepEqual(deriveIdentityCurvature('identity-1', 'u-a'), deriveIdentityCurvature('identity-1', 'u-a'));
});

test('identity curvature changes only with explicit coordinates', () => {
  assert.notEqual(
    deriveIdentityCurvature('identity-1', 'u-a').fingerprint,
    deriveIdentityCurvature('identity-1', 'u-b').fingerprint,
  );
});

test('identity curvature output is immutable', () => {
  const model = deriveIdentityCurvature('identity-1', 'u-a');
  assert.ok(Object.isFrozen(model));
  assert.ok(Object.isFrozen(model.components));
});

test('identity curvature forbids implicit identity merges', () => {
  assert.throws(() => assertSameIdentity(
    deriveIdentityCurvature('identity-1', 'u-a'),
    deriveIdentityCurvature('identity-2', 'u-a'),
  ), /forbidden/);
});
