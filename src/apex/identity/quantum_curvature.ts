import { deepFreeze, requireNonEmpty, stableHash } from '../canonical.ts';
import type { CurvatureModel, JsonValue } from '../types.ts';

function axis(identityId: string, universeId: string, axisName: string): number {
  const hash = stableHash({ identityId, universeId, axis: axisName });
  const numerator = Number(BigInt(`0x${hash}`) >> 11n);
  return Number((numerator / 0x1fffffffffffff).toFixed(12));
}

/** Derives session-independent identity curvature from explicit identity and universe coordinates. */
export function deriveIdentityCurvature(identityId: string, universeId: string): CurvatureModel {
  requireNonEmpty(identityId, 'identityId');
  requireNonEmpty(universeId, 'universeId');
  const components = deepFreeze([
    axis(identityId, universeId, 'x'),
    axis(identityId, universeId, 'y'),
    axis(identityId, universeId, 'z'),
  ] as const);
  const fingerprintInput: JsonValue = { identityId, universeId, components };
  return deepFreeze({
    identityId,
    universeId,
    components,
    fingerprint: `curvature-${stableHash(fingerprintInput)}`,
  });
}

/** Identity models may be compared, but different identities are never implicitly merged. */
export function assertSameIdentity(left: CurvatureModel, right: CurvatureModel): void {
  if (left.identityId !== right.identityId) throw new Error('Implicit identity merge is forbidden');
}
