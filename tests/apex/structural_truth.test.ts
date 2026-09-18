import assert from 'node:assert/strict';
import test from 'node:test';
import { appendStructuralTruth, createTruthGraph, truthValues } from '../../src/apex/vision/structural_truth.ts';

test('truth graph appends immutably', () => {
  const empty = createTruthGraph();
  const next = appendStructuralTruth(empty, { universeId: 'u-a', key: 'law', value: 'stable' });
  assert.equal(empty.nodes.length, 0);
  assert.equal(next.nodes.length, 1);
  assert.ok(Object.isFrozen(next));
  assert.ok(Object.isFrozen(next.nodes));
});

test('truth graph rejects contradictions across universes', () => {
  const graph = appendStructuralTruth(createTruthGraph(), { universeId: 'u-a', key: 'law', value: 'stable' });
  assert.throws(() => appendStructuralTruth(graph, { universeId: 'u-b', key: 'law', value: 'changed' }), /contradiction/);
});

test('truth graph accepts the same truth across universes', () => {
  let graph = appendStructuralTruth(createTruthGraph(), { universeId: 'u-b', key: 'law', value: 'stable' });
  graph = appendStructuralTruth(graph, { universeId: 'u-a', key: 'law', value: 'stable' });
  assert.deepEqual(truthValues(graph, 'law'), ['stable', 'stable']);
});

test('truth graph treats an identical assertion as idempotent', () => {
  const graph = appendStructuralTruth(createTruthGraph(), { universeId: 'u-a', key: 'law', value: 'stable' });
  assert.equal(appendStructuralTruth(graph, { universeId: 'u-a', key: 'law', value: 'stable' }), graph);
});

test('truth graph requires parents to exist before children', () => {
  assert.throws(() => appendStructuralTruth(createTruthGraph(), {
    universeId: 'u-a',
    key: 'derived-law',
    value: true,
    parentIds: ['missing'],
  }), /Unknown/);
});
