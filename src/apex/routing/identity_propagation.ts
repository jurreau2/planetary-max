import { deepFreeze, requireFence, requireNonEmpty, sortedUnique, stableHash } from '../canonical.ts';
import { assertApexAuthorized } from '../governance/apex_governance.ts';
import { assertCurvatureStable } from '../stabilization/curvature_stabilizer.ts';
import type { ApexGovernanceEnvelope, CurvatureState, IdentityPropagation, JsonValue } from '../types.ts';

/** Propagates one explicit identity to deterministically ordered universes under a shared fence. */
export function propagateIdentity(
  state: CurvatureState,
  sourceUniverse: string,
  targetUniverses: readonly string[],
  governance: ApexGovernanceEnvelope,
  expectedFence: number,
): readonly IdentityPropagation[] {
  requireNonEmpty(sourceUniverse, 'sourceUniverse');
  requireFence(expectedFence, 'expectedFence');
  assertCurvatureStable(state, expectedFence);
  if (state.model.identityId !== governance.subjectId) {
    throw new Error('Identity propagation curvature does not match governance subject');
  }
  if (state.model.universeId !== sourceUniverse) throw new Error('Curvature source universe mismatch');
  const targets = sortedUnique(targetUniverses);
  if (targets.length === 0) throw new Error('Identity propagation requires an explicit target');
  assertApexAuthorized(governance, 'identity.propagate', sourceUniverse, expectedFence);
  return deepFreeze(targets.map((targetUniverse) => {
    requireNonEmpty(targetUniverse, 'targetUniverse');
    if (targetUniverse === sourceUniverse) throw new Error('Identity propagation target must be another universe');
    assertApexAuthorized(governance, 'identity.propagate', targetUniverse, expectedFence);
    const identity: JsonValue = {
      identityId: state.model.identityId,
      sourceUniverse,
      targetUniverse,
      curvatureFingerprint: state.model.fingerprint,
      fence: expectedFence,
    };
    return deepFreeze({
      propagationId: `propagation-${stableHash(identity)}`,
      identityId: state.model.identityId,
      sourceUniverse,
      targetUniverse,
      curvatureFingerprint: state.model.fingerprint,
      fence: expectedFence,
    });
  }));
}
