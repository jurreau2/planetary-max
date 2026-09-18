import assert from 'node:assert/strict';
import test from 'node:test';
import { attractAlgorithm } from '../../src/apex/attraction/algorithm_attraction.ts';
import { buildInterstateRoutes } from '../../src/apex/attraction/interstate_engine.ts';
import type { AttractionEnvelope } from '../../src/apex/types.ts';
import { FENCE, governance, stableCurvature, stableTruth } from './fixtures.ts';

function fixture(): { readonly envelope: AttractionEnvelope; readonly decisions: ReturnType<typeof attractAlgorithm> } {
  const report = stableTruth().report;
  const curvature = stableCurvature();
  const envelope: AttractionEnvelope = {
    envelopeId: 'attraction-1',
    algorithmId: 'algorithm-1',
    sourceUniverse: 'u-a',
    candidateUniverses: ['u-b', 'u-c'],
    truthDigest: report.digest,
    curvatureFingerprint: curvature.model.fingerprint,
    fence: FENCE,
    governance: governance(['attraction.execute']),
  };
  return { envelope, decisions: attractAlgorithm(envelope, stableTruth().graph, report, curvature, FENCE) };
}

test('interstate engine preserves deterministic attraction order', () => {
  const { envelope, decisions } = fixture();
  const truth = stableTruth();
  const routes = buildInterstateRoutes(envelope, truth.graph, truth.report, stableCurvature(), FENCE);
  assert.deepEqual(routes.map((route) => route.targetUniverse), decisions.map((decision) => decision.targetUniverse));
});

test('interstate engine rejects unstable truth', () => {
  const { envelope } = fixture();
  const truth = stableTruth();
  const report = { ...truth.report, stable: false, issues: ['unstable'] };
  assert.throws(() => buildInterstateRoutes(envelope, truth.graph, report, stableCurvature(), FENCE));
});

test('interstate engine rejects stale fences', () => {
  const { envelope } = fixture();
  const truth = stableTruth();
  assert.throws(() => buildInterstateRoutes(envelope, truth.graph, truth.report, stableCurvature(), FENCE + 1));
});
