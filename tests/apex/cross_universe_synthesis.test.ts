import assert from 'node:assert/strict';
import test from 'node:test';
import { synthesizeAcrossUniverses } from '../../src/apex/synthesis/cross_universe.ts';
import { FENCE, governance } from './fixtures.ts';

const lanes = [
  { laneId: 'lane-b', sourceUniverse: 'u-b', targetUniverse: 'u-c', payload: 2, fence: FENCE },
  { laneId: 'lane-a', sourceUniverse: 'u-a', targetUniverse: 'u-c', payload: 1, fence: FENCE },
] as const;

test('cross-universe synthesis orders lanes deterministically', () => {
  const grant = governance(['synthesis.execute']);
  const first = synthesizeAcrossUniverses(lanes, grant, FENCE);
  const second = synthesizeAcrossUniverses([...lanes].reverse(), grant, FENCE);
  assert.deepEqual(first, second);
  assert.deepEqual(first.orderedLaneIds, ['lane-a', 'lane-b']);
});

test('cross-universe synthesis rejects stale fences', () => {
  assert.throws(() => synthesizeAcrossUniverses([{ ...lanes[0], fence: FENCE - 1 }], governance(['synthesis.execute']), FENCE));
});

test('cross-universe synthesis rejects mixed targets', () => {
  assert.throws(() => synthesizeAcrossUniverses([{ ...lanes[0], targetUniverse: 'u-a' }, lanes[1]], governance(['synthesis.execute']), FENCE));
});

test('cross-universe synthesis requires governance for every universe', () => {
  assert.throws(() => synthesizeAcrossUniverses(lanes, governance(['synthesis.execute'], ['u-a', 'u-c']), FENCE));
});

test('cross-universe synthesis rejects a lane that targets its source', () => {
  const lane = { laneId: 'lane-a', sourceUniverse: 'u-a', targetUniverse: 'u-a', payload: 1, fence: FENCE };
  assert.throws(() => synthesizeAcrossUniverses([lane], governance(['synthesis.execute']), FENCE));
});

test('cross-universe synthesis identity preserves source provenance', () => {
  const grant = governance(['synthesis.execute']);
  const fromA = synthesizeAcrossUniverses([
    { laneId: 'lane', sourceUniverse: 'u-a', targetUniverse: 'u-c', payload: 1, fence: FENCE },
  ], grant, FENCE);
  const fromB = synthesizeAcrossUniverses([
    { laneId: 'lane', sourceUniverse: 'u-b', targetUniverse: 'u-c', payload: 1, fence: FENCE },
  ], grant, FENCE);
  assert.notEqual(fromA.synthesisId, fromB.synthesisId);
});
