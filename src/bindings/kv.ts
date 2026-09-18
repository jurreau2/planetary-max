import { canonicalString, requireFence, requireNonEmpty, stableHash } from '../apex/canonical.ts';
import type { JsonValue } from '../apex/types.ts';

export const KV_BINDING_NAME = 'PORTAL_KV';
const KV_SNAPSHOT_PREFIX = 'snapshot/v1';

export type KVNamespaceBinding = {
  get<T = unknown>(key: string, type: 'json'): Promise<T | null>;
  put(key: string, value: string, options?: { readonly metadata?: unknown }): Promise<void>;
};

export type KvSnapshot = {
  readonly stateKey: string;
  readonly sourceDigest: string;
  readonly fence: number;
  readonly value: JsonValue;
  readonly authoritative: false;
  readonly digest: string;
};

function snapshotIdentity(snapshot: Omit<KvSnapshot, 'digest'>): JsonValue {
  return {
    stateKey: snapshot.stateKey,
    sourceDigest: snapshot.sourceDigest,
    fence: snapshot.fence,
    value: snapshot.value,
    authoritative: false,
  };
}

export function kvSnapshotKey(stateKey: string, fence: number): string {
  requireNonEmpty(stateKey, 'stateKey');
  requireFence(fence);
  return `${KV_SNAPSHOT_PREFIX}/${encodeURIComponent(stateKey)}/${fence.toString().padStart(16, '0')}.json`;
}

/** Persists only a fenced, explicitly non-authoritative snapshot derived from R2 state. */
export async function writeKvSnapshot(
  namespace: KVNamespaceBinding,
  input: Omit<KvSnapshot, 'authoritative' | 'digest'>,
  expectedFence: number,
): Promise<KvSnapshot> {
  requireFence(expectedFence, 'expectedFence');
  requireFence(input.fence);
  requireNonEmpty(input.sourceDigest, 'sourceDigest');
  if (input.fence !== expectedFence) throw new Error('KV snapshot fence mismatch');
  const base = { ...input, authoritative: false as const };
  const snapshot = Object.freeze({ ...base, digest: stableHash(snapshotIdentity(base)) });
  await namespace.put(kvSnapshotKey(input.stateKey, input.fence), canonicalString(snapshot), {
    metadata: { authoritative: false, fence: input.fence, sourceDigest: input.sourceDigest },
  });
  return snapshot;
}

export async function readKvSnapshot(
  namespace: KVNamespaceBinding,
  stateKey: string,
  fence: number,
): Promise<KvSnapshot | null> {
  const snapshot = await namespace.get<KvSnapshot>(kvSnapshotKey(stateKey, fence), 'json');
  if (snapshot === null) return null;
  if (snapshot.authoritative !== false || snapshot.fence !== fence || snapshot.stateKey !== stateKey) {
    throw new Error('KV snapshot integrity mismatch');
  }
  const { digest, ...base } = snapshot;
  if (digest !== stableHash(snapshotIdentity(base))) throw new Error('KV snapshot digest mismatch');
  return Object.freeze(snapshot);
}

export const KV_DURABILITY = Object.freeze({ authoritative: false, snapshotOnly: true, fencedWrites: true });
