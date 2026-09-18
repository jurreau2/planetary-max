import { canonicalString, deepFreeze, requireFence, requireNonEmpty, stableHash } from '../apex/canonical.ts';
import type { JsonValue } from '../apex/types.ts';

export const R2_BINDING_NAME = 'PORTAL_R2';
const R2_STATE_PREFIX = 'authoritative/v1';

export type R2ObjectReference = { readonly key: string };
export type R2ObjectBodyReference = R2ObjectReference & { text(): Promise<string> };
export type R2ListResult = {
  readonly objects: readonly R2ObjectReference[];
  readonly truncated: boolean;
  readonly cursor?: string;
};

export type R2BucketBinding = {
  head(key: string): Promise<R2ObjectReference | null>;
  get(key: string): Promise<R2ObjectBodyReference | null>;
  put(key: string, value: string, options?: { readonly httpMetadata?: { readonly contentType?: string } }): Promise<unknown>;
  list(options?: { readonly prefix?: string; readonly cursor?: string }): Promise<R2ListResult>;
};

export type AuthoritativeState = {
  readonly stateKey: string;
  readonly fence: number;
  readonly value: JsonValue;
  readonly digest: string;
};

function statePrefix(stateKey: string): string {
  requireNonEmpty(stateKey, 'stateKey');
  return `${R2_STATE_PREFIX}/${encodeURIComponent(stateKey)}/`;
}

function stateIdentity(stateKey: string, fence: number, value: JsonValue): JsonValue {
  return { stateKey, fence, value };
}

function stateObjectKey(state: AuthoritativeState): string {
  return `${statePrefix(state.stateKey)}${state.fence.toString().padStart(16, '0')}/${state.digest}.json`;
}

/** Writes immutable, fence-addressed authoritative state; identical writes are idempotent. */
export async function writeAuthoritativeState(
  bucket: R2BucketBinding,
  input: Omit<AuthoritativeState, 'digest'>,
  expectedFence: number,
): Promise<AuthoritativeState> {
  requireFence(expectedFence, 'expectedFence');
  requireFence(input.fence);
  if (input.fence !== expectedFence) throw new Error('R2 authoritative write fence mismatch');
  const value = deepFreeze(JSON.parse(canonicalString(input.value)) as JsonValue);
  const state: AuthoritativeState = deepFreeze({
    ...input,
    value,
    digest: stableHash(stateIdentity(input.stateKey, input.fence, value)),
  });
  const objectKey = stateObjectKey(state);
  const serializedState = canonicalString(state);
  if (await bucket.head(objectKey) === null) {
    await bucket.put(objectKey, serializedState, { httpMetadata: { contentType: 'application/json' } });
  }
  return state;
}

type ParsedStateObject = {
  readonly object: R2ObjectReference;
  readonly fence: number;
  readonly digest: string;
};

function parseStateObject(object: R2ObjectReference, prefix: string): ParsedStateObject {
  const suffix = object.key.slice(prefix.length);
  const match = /^(\d{16})\/([a-f0-9]{16})\.json$/.exec(suffix);
  if (match === null) throw new Error(`Invalid R2 authoritative object key: ${object.key}`);
  return { object, fence: Number(match[1]), digest: match[2] };
}

async function listCurrentStateObjects(bucket: R2BucketBinding, prefix: string): Promise<readonly ParsedStateObject[]> {
  let highestFence = -1;
  let current: ParsedStateObject[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, ...(cursor === undefined ? {} : { cursor }) });
    for (const object of page.objects) {
      const parsed = parseStateObject(object, prefix);
      if (parsed.fence > highestFence) {
        highestFence = parsed.fence;
        current = [parsed];
      } else if (parsed.fence === highestFence && current.length < 2) {
        current.push(parsed);
      }
    }
    cursor = page.truncated ? page.cursor : undefined;
    if (page.truncated && cursor === undefined) throw new Error('R2 listing returned no continuation cursor');
  } while (cursor !== undefined);
  return current.sort((left, right) => left.object.key < right.object.key ? -1 : left.object.key > right.object.key ? 1 : 0);
}

/** Reads the highest unambiguous fence and rejects conflicting writes at that fence. */
export async function readAuthoritativeState(
  bucket: R2BucketBinding,
  stateKey: string,
): Promise<AuthoritativeState | null> {
  const prefix = statePrefix(stateKey);
  const current = await listCurrentStateObjects(bucket, prefix);
  if (current.length === 0) return null;
  const highestFence = current[0].fence;
  if (current.length !== 1) throw new Error(`R2 authoritative fence conflict: ${highestFence}`);
  const body = await bucket.get(current[0].object.key);
  if (body === null) throw new Error('R2 authoritative object disappeared during read');
  const state = JSON.parse(await body.text()) as AuthoritativeState;
  const expectedDigest = stableHash(stateIdentity(state.stateKey, state.fence, state.value));
  if (
    state.stateKey !== stateKey
    || state.fence !== highestFence
    || state.digest !== expectedDigest
    || current[0].digest !== expectedDigest
  ) {
    throw new Error('R2 authoritative state integrity mismatch');
  }
  return deepFreeze(state);
}

export const R2_DURABILITY = Object.freeze({ authoritative: true, immutableFences: true, conflictDetection: true });
