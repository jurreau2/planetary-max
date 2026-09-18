import assert from 'node:assert/strict';
import test from 'node:test';
import { attractAlgorithm } from '../../src/apex/attraction/algorithm_attraction.ts';
import type { AttractionEnvelope } from '../../src/apex/types.ts';
import { FENCE, governance, stableCurvature, stableTruth } from './fixtures.ts';

function envelope(): AttractionEnvelope {
  const truth = stableTruth().report;
  const curvature = stableCurvature();
  return {
    envelopeId: 'attraction-1',
    algorithmId: 'algorithm-1',
    sourceUniverse: 'u-a',
    candidateUniverses: ['u-c', 'u-b'],
    truthDigest: truth.digest,
    curvatureFingerprint: curvature.model.fingerprint,
    fence: FENCE,
    governance: governance(['attraction.execute']),
  };
}

test('algorithm attraction is deterministic and interstate', () => {
  const input = envelope();
  const truth = stableTruth();
  assert.deepEqual(
    attractAlgorithm(input, truth.graph, truth.report, stableCurvature(), FENCE),
    attractAlgorithm({ ...input, candidateUniverses: [...input.candidateUniverses].reverse() }, truth.graph, truth.report, stableCurvature(), FENCE),
  );
});

test('algorithm attraction rejects unstable truth', () => {
  const truth = stableTruth();
  const report = { ...truth.report, stable: false, issues: ['unstable'] };
  assert.throws(() => attractAlgorithm(envelope(), truth.graph, report, stableCurvature(), FENCE));
});

test('algorithm attraction rejects curvature mismatch', () => {
  const truth = stableTruth();
  assert.throws(() => attractAlgorithm({ ...envelope(), curvatureFingerprint: 'wrong' }, truth.graph, truth.report, stableCurvature(), FENCE));
});

test('algorithm attraction requires stable-truth governance', () => {
  const truth = stableTruth();
  const input = { ...envelope(), governance: governance(['attraction.execute'], undefined, []) };
  assert.throws(() => attractAlgorithm(input, truth.graph, truth.report, stableCurvature(), FENCE));
});

test('algorithm attraction binds curvature identity to governance subject', () => {
  const truth = stableTruth();
  const curvature = stableCurvature('session-a', FENCE, 'u-a', 'identity-2');
  const input = { ...envelope(), curvatureFingerprint: curvature.model.fingerprint };
  assert.throws(() => attractAlgorithm(input, truth.graph, truth.report, curvature, FENCE), /governance subject/);
});
