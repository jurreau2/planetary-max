import assert from 'node:assert/strict';
import test from 'node:test';
import { appendStructuralTruth, createTruthGraph } from '../../src/apex/vision/structural_truth.ts';
import { stabilizeTruth } from '../../src/apex/stabilization/truth_stabilizer.ts';
import { stableTruth } from './fixtures.ts';

test('truth stabilizer accepts a canonical append-only graph', () => {
  const { report } = stableTruth();
  assert.equal(report.stable, true);
  assert.deepEqual(report.issues, []);
});

test('truth stabilizer detects graph digest tampering', () => {
  const { graph } = stableTruth();
  const report = stabilizeTruth({ ...graph, digest: 'tampered' });
  assert.equal(report.stable, false);
  assert.match(report.issues.join(' '), /digest/);
});

test('truth stabilizer detects append version tampering', () => {
  const { graph } = stableTruth();
  assert.equal(stabilizeTruth({ ...graph, version: graph.version + 1 }).stable, false);
});

test('truth stabilizer detects ancestry that is not append ordered', () => {
  const parent = appendStructuralTruth(createTruthGraph(), { universeId: 'u-a', key: 'parent', value: true });
  const child = appendStructuralTruth(parent, {
    universeId: 'u-a',
    key: 'child',
    value: true,
    parentIds: [parent.nodes[0].nodeId],
  });
  assert.equal(stabilizeTruth({ ...child, nodes: [...child.nodes].reverse() }).stable, false);
});

test('truth stabilizer rejects empty node coordinates', () => {
  const { graph } = stableTruth();
  const malformed = { ...graph.nodes[0], universeId: '', key: '' };
  const report = stabilizeTruth({ ...graph, nodes: [malformed] });
  assert.equal(report.stable, false);
  assert.match(report.issues.join(' '), /empty/);
});
