import assert from 'node:assert/strict';
import test from 'node:test';
import { stabilizeSynthesis } from '../../src/apex/stabilization/synthesis_stabilizer.ts';
import { FENCE, governance, stableCurvature, stableTruth } from './fixtures.ts';

const lanes = [{ laneId: 'lane-a', sourceUniverse: 'u-a', targetUniverse: 'u-b', payload: true, fence: FENCE }] as const;

test('synthesis stabilizer permits fully stable inputs', () => {
  const truth = stableTruth();
  const curvature = [stableCurvature(), stableCurvature('session-b', FENCE, 'u-b')];
  const result = stabilizeSynthesis(lanes, governance(['synthesis.execute']), truth.graph, truth.report, curvature, FENCE);
  assert.equal(result.targetUniverse, 'u-b');
});

test('synthesis stabilizer rejects unstable truth', () => {
  const truth = stableTruth();
  const report = { ...truth.report, stable: false, issues: ['contradiction'] };
  const curvature = [stableCurvature(), stableCurvature('session-b', FENCE, 'u-b')];
  assert.throws(() => stabilizeSynthesis(lanes, governance(['synthesis.execute']), truth.graph, report, curvature, FENCE));
});

test('synthesis stabilizer rejects invalid curvature', () => {
  const truth = stableTruth();
  const curvature = { ...stableCurvature(), stable: false };
  assert.throws(() => stabilizeSynthesis(lanes, governance(['synthesis.execute']), truth.graph, truth.report, [curvature, stableCurvature('session-b', FENCE, 'u-b')], FENCE));
});

test('synthesis stabilizer requires curvature for every participating universe', () => {
  const truth = stableTruth();
  assert.throws(() => stabilizeSynthesis(lanes, governance(['synthesis.execute']), truth.graph, truth.report, [stableCurvature()], FENCE));
});

test('synthesis stabilizer binds curvature identity to governance subject', () => {
  const truth = stableTruth();
  const mismatched = stableCurvature('session-a', FENCE, 'u-a', 'identity-2');
  assert.throws(() => stabilizeSynthesis(lanes, governance(['synthesis.execute']), truth.graph, truth.report, [mismatched], FENCE), /governance subject/);
});
