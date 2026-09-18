import assert from 'node:assert/strict';
import test from 'node:test';
import { runAfaBackHalf } from '../../src/apex/afa/back_half.ts';
import { apexEnvelope } from './fixtures.ts';

test('AFA back-half orders universes and sequences deterministically', () => {
  const result = runAfaBackHalf([apexEnvelope('u-b', 1), apexEnvelope('u-a', 2), apexEnvelope('u-a', 1)]);
  assert.deepEqual(result.envelopes.map((item) => item.envelopeId), ['u-a-1', 'u-a-2', 'u-b-1']);
  assert.equal(result.digest, runAfaBackHalf([...result.envelopes].reverse()).digest);
});

test('AFA back-half rejects a MAX-OS universe mismatch', () => {
  const envelope = apexEnvelope();
  assert.throws(() => runAfaBackHalf([{ ...envelope, maxOsEnvelope: { ...envelope.maxOsEnvelope, universeId: 'u-b' } }]));
});

test('AFA back-half rejects duplicate or non-increasing sequences', () => {
  assert.throws(() => runAfaBackHalf([apexEnvelope('u-a', 1), { ...apexEnvelope('u-a', 1), envelopeId: 'other' }]));
});

test('AFA back-half rejects missing upstream MAX-OS governance', () => {
  const envelope = apexEnvelope();
  const maxOsEnvelope = {
    ...envelope.maxOsEnvelope,
    governance: { ...envelope.maxOsEnvelope.governance, maxOsApproved: false },
  };
  assert.throws(() => runAfaBackHalf([{ ...envelope, maxOsEnvelope }]));
});
