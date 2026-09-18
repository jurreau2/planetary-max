import assert from 'node:assert/strict';
import test from 'node:test';
import { createApexGovernanceEnvelope } from '../../src/apex/governance/apex_governance.ts';
import { enforceApexGovernance, evaluateApexGovernance } from '../../src/apex/governance/apex_governance_engine.ts';
import { APPROVAL, FENCE, governance } from './fixtures.ts';

test('apex governance requires planetary approval', () => {
  assert.throws(() => createApexGovernanceEnvelope({
    subjectId: 'identity-1',
    approval: { ...APPROVAL, planetaryApproved: false },
    allowedOperations: ['afa.process'],
    allowedUniverses: ['u-a'],
    fence: FENCE,
  }));
});

test('apex governance requires MAX-OS approval', () => {
  assert.throws(() => createApexGovernanceEnvelope({
    subjectId: 'identity-1',
    approval: { ...APPROVAL, maxOsApproved: false },
    allowedOperations: ['afa.process'],
    allowedUniverses: ['u-a'],
    fence: FENCE,
  }));
});

test('apex governance decisions are deterministic', () => {
  const request = { envelope: governance(['routing.dispatch']), operation: 'routing.dispatch', universes: ['u-b', 'u-a'], expectedFence: FENCE };
  assert.deepEqual(evaluateApexGovernance(request), evaluateApexGovernance({ ...request, universes: ['u-a', 'u-b'] }));
});

test('apex governance enforces required constraints', () => {
  assert.throws(() => enforceApexGovernance({
    envelope: governance(['attraction.execute'], undefined, []),
    operation: 'attraction.execute',
    universes: ['u-a'],
    expectedFence: FENCE,
    requiredConstraints: ['stable-truth'],
  }));
});

test('apex governance rejects stale fences', () => {
  const decision = evaluateApexGovernance({
    envelope: governance(['afa.process']),
    operation: 'afa.process',
    universes: ['u-a'],
    expectedFence: FENCE + 1,
  });
  assert.equal(decision.authorized, false);
});

test('apex governance rejects invalid fences without throwing', () => {
  const decision = evaluateApexGovernance({
    envelope: governance(['afa.process']),
    operation: 'afa.process',
    universes: ['u-a'],
    expectedFence: Number.NaN,
  });
  assert.equal(decision.authorized, false);
  assert.match(decision.reasons.join(' '), /safe integer/);
});

test('apex governance rejects an empty universe scope', () => {
  const decision = evaluateApexGovernance({
    envelope: governance(['afa.process']),
    operation: 'afa.process',
    universes: [],
    expectedFence: FENCE,
  });
  assert.equal(decision.authorized, false);
  assert.match(decision.reasons.join(' '), /at least one universe/);
});
