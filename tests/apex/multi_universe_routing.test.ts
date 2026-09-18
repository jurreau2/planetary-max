import assert from 'node:assert/strict';
import test from 'node:test';
import { routeAcrossUniverses } from '../../src/apex/routing/multi_universe_router.ts';
import { FENCE, apexEnvelope, stableTruth } from './fixtures.ts';

const routes = [
  { routeId: 'route-b', sourceUniverse: 'u-a', targetUniverse: 'u-c', lane: 'beta', sequence: 1, fence: FENCE },
  { routeId: 'route-a', sourceUniverse: 'u-a', targetUniverse: 'u-b', lane: 'alpha', sequence: 1, fence: FENCE },
] as const;

test('multi-universe routing is deterministic', () => {
  const envelope = apexEnvelope();
  const truth = stableTruth();
  assert.deepEqual(
    routeAcrossUniverses(envelope, routes, truth.graph, truth.report, FENCE),
    routeAcrossUniverses(envelope, [...routes].reverse(), truth.graph, truth.report, FENCE),
  );
});

test('multi-universe routing requires stabilized truth', () => {
  const truth = stableTruth();
  const report = { ...truth.report, stable: false, issues: ['unstable'] };
  assert.throws(() => routeAcrossUniverses(apexEnvelope(), routes, truth.graph, report, FENCE));
});

test('multi-universe routing requires explicit routes', () => {
  const truth = stableTruth();
  assert.throws(() => routeAcrossUniverses(apexEnvelope(), [], truth.graph, truth.report, FENCE));
});

test('multi-universe routing rejects stale fences', () => {
  const truth = stableTruth();
  assert.throws(() => routeAcrossUniverses(apexEnvelope(), [{ ...routes[0], fence: FENCE - 1 }], truth.graph, truth.report, FENCE));
});

test('multi-universe routing rejects a report forged for another graph', () => {
  const truth = stableTruth();
  const forgedGraph = { ...truth.graph, digest: 'forged' };
  assert.throws(() => routeAcrossUniverses(apexEnvelope(), routes, forgedGraph, truth.report, FENCE));
});
