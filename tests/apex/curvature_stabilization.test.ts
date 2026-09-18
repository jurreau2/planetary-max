import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveIdentityCurvature } from '../../src/apex/identity/quantum_curvature.ts';
import { assertCurvatureStable, stabilizeCurvature } from '../../src/apex/stabilization/curvature_stabilizer.ts';
import { FENCE } from './fixtures.ts';

test('curvature remains stable across sessions', () => {
  const model = deriveIdentityCurvature('identity-1', 'u-a');
  const first = stabilizeCurvature(model, 'session-a', FENCE);
  const second = stabilizeCurvature(model, 'session-b', FENCE, first);
  assert.equal(second.stable, true);
  assert.equal(first.model.fingerprint, second.model.fingerprint);
});

test('curvature stabilizer detects drift', () => {
  const first = stabilizeCurvature(deriveIdentityCurvature('identity-1', 'u-a'), 'session-a', FENCE);
  const drifted = stabilizeCurvature(deriveIdentityCurvature('identity-1', 'u-b'), 'session-b', FENCE, first);
  assert.equal(drifted.stable, false);
});

test('curvature stabilizer detects a forged model', () => {
  const model = deriveIdentityCurvature('identity-1', 'u-a');
  const forged = { ...model, fingerprint: 'forged' };
  assert.equal(stabilizeCurvature(forged, 'session-a', FENCE).stable, false);
});

test('curvature validation rejects stale fences', () => {
  const state = stabilizeCurvature(deriveIdentityCurvature('identity-1', 'u-a'), 'session-a', FENCE);
  assert.throws(() => assertCurvatureStable(state, FENCE + 1), /fence/);
});
