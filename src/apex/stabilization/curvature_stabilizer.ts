import { deepFreeze, requireFence, requireNonEmpty } from '../canonical.ts';
import { deriveIdentityCurvature } from '../identity/quantum_curvature.ts';
import type { CurvatureModel, CurvatureState } from '../types.ts';

function modelIsCanonical(model: CurvatureModel): boolean {
  const expected = deriveIdentityCurvature(model.identityId, model.universeId);
  return expected.fingerprint === model.fingerprint
    && expected.components.every((component, index) => component === model.components[index]);
}

/** Stabilizes curvature without using session identity as an input, preventing cross-session drift. */
export function stabilizeCurvature(
  model: CurvatureModel,
  sessionId: string,
  fence: number,
  previous?: CurvatureState,
): CurvatureState {
  requireNonEmpty(sessionId, 'sessionId');
  requireFence(fence);
  const noDrift = previous === undefined
    || (previous.model.identityId === model.identityId
      && previous.model.universeId === model.universeId
      && previous.model.fingerprint === model.fingerprint);
  return deepFreeze({ model, sessionId, fence, stable: modelIsCanonical(model) && noDrift });
}

export function assertCurvatureStable(state: CurvatureState, expectedFence: number): void {
  requireFence(expectedFence, 'expectedFence');
  if (!state.stable) throw new Error('Identity curvature is unstable');
  if (state.fence !== expectedFence) throw new Error('Identity curvature fence mismatch');
  if (!modelIsCanonical(state.model)) throw new Error('Identity curvature model is invalid');
}
