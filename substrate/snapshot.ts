import type { PlanetaryState } from './planetary_state';

export type Snapshot = { id: string; createdAt: string; state: PlanetaryState; checksum: string };

export function checksum(state: PlanetaryState): string {
  const text = JSON.stringify(state);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createSnapshot(state: PlanetaryState, now = new Date().toISOString()): Snapshot { return { id: `snap-${state.tick}-${state.version}`, createdAt: now, state: structuredClone(state), checksum: checksum(state) }; }
export function verifySnapshot(snapshot: Snapshot): boolean { return checksum(snapshot.state) === snapshot.checksum; }
