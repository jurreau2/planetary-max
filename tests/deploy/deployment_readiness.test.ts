import assert from 'node:assert/strict';
import test from 'node:test';
import type { R2BucketBinding } from '../../src/bindings/r2.ts';
import { validateDeploymentReadiness } from '../../src/deploy/readiness.ts';
import { SUBSTRATE_CAPABILITIES } from '../../src/deploy/validation.ts';
import { readyEnv } from './fixtures.ts';

test('deployment readiness passes all valid gates deterministically', () => {
  const env = readyEnv();
  assert.deepEqual(validateDeploymentReadiness(env), validateDeploymentReadiness(env));
  assert.equal(validateDeploymentReadiness(env).ready, true);
});

test('deployment readiness requires every substrate binding', () => {
  const env = readyEnv();
  const report = validateDeploymentReadiness({ ...env, PORTAL_R2: undefined });
  assert.equal(report.ready, false);
  assert.match(report.issues.join(' '), /PORTAL_R2/);
});

test('deployment readiness requires the complete R2 method surface', () => {
  const env = readyEnv();
  const bucket = env.PORTAL_R2;
  const withoutHead = {
    get: bucket.get.bind(bucket),
    put: bucket.put.bind(bucket),
    list: bucket.list.bind(bucket),
  } as unknown as R2BucketBinding;
  assert.equal(validateDeploymentReadiness({ ...env, PORTAL_R2: withoutHead }).ready, false);
});

test('deployment readiness requires Phase 16', () => {
  assert.equal(validateDeploymentReadiness({ ...readyEnv(), PORTAL_OS_PHASE: '15' }).ready, false);
});

test('deployment readiness requires strict resilience', () => {
  assert.equal(validateDeploymentReadiness({ ...readyEnv(), RESILIENCE_MODE: 'permissive' }).ready, false);
});

test('deployment readiness rejects stale-success circuit behavior', () => {
  assert.equal(validateDeploymentReadiness({ ...readyEnv(), CIRCUIT_BREAKER_MODE: 'stale-success' }).ready, false);
});

test('deployment readiness rejects non-authoritative R2 capability', () => {
  const capabilities = { ...SUBSTRATE_CAPABILITIES, r2Authoritative: false };
  assert.equal(validateDeploymentReadiness(readyEnv(), undefined, capabilities).ready, false);
});
