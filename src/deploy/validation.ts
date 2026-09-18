import { canonicalString, compareText, deepFreeze, stableHash } from '../apex/canonical.ts';
import type { JsonValue } from '../apex/types.ts';
import { D1_BINDING_NAME, D1_DURABILITY } from '../bindings/d1.ts';
import { KV_BINDING_NAME, KV_DURABILITY } from '../bindings/kv.ts';
import { R2_BINDING_NAME, R2_DURABILITY } from '../bindings/r2.ts';

export const EXPECTED_PORTAL_OS_PHASE = '16';
export const EXPECTED_RESILIENCE_MODE = 'strict';
export const EXPECTED_CIRCUIT_BREAKER_MODE = 'fail-closed';
export const EXPECTED_OBSERVABILITY_MODE = 'structured';

export type SubstrateCapabilities = {
  readonly r2Authoritative: boolean;
  readonly kvSnapshotOnly: boolean;
  readonly d1TombstoneOnly: boolean;
  readonly fencedWrites: boolean;
  readonly circuitBreakerStable: boolean;
};

export const SUBSTRATE_CAPABILITIES: SubstrateCapabilities = Object.freeze({
  r2Authoritative: R2_DURABILITY.authoritative,
  kvSnapshotOnly: KV_DURABILITY.snapshotOnly && !KV_DURABILITY.authoritative,
  d1TombstoneOnly: D1_DURABILITY.tombstoneOnly && !D1_DURABILITY.authoritative,
  fencedWrites: R2_DURABILITY.immutableFences && KV_DURABILITY.fencedWrites,
  circuitBreakerStable: true,
});

export type BindingManifest = {
  readonly r2: string;
  readonly kv: string;
  readonly d1: string;
};

export const REQUIRED_BINDINGS: BindingManifest = Object.freeze({
  r2: R2_BINDING_NAME,
  kv: KV_BINDING_NAME,
  d1: D1_BINDING_NAME,
});

export function validateBindingManifest(manifest: BindingManifest): readonly string[] {
  const issues: string[] = [];
  if (manifest.r2 !== REQUIRED_BINDINGS.r2) issues.push('R2 binding name mismatch');
  if (manifest.kv !== REQUIRED_BINDINGS.kv) issues.push('KV binding name mismatch');
  if (manifest.d1 !== REQUIRED_BINDINGS.d1) issues.push('D1 binding name mismatch');
  return deepFreeze(issues.sort(compareText));
}

export function validateSubstrateCapabilities(capabilities: SubstrateCapabilities): readonly string[] {
  const issues: string[] = [];
  if (!capabilities.r2Authoritative) issues.push('R2 must be authoritative');
  if (!capabilities.kvSnapshotOnly) issues.push('KV must be snapshot-only');
  if (!capabilities.d1TombstoneOnly) issues.push('D1 deletes must use tombstones');
  if (!capabilities.fencedWrites) issues.push('Substrate writes must be fenced');
  if (!capabilities.circuitBreakerStable) issues.push('Circuit breaker must be fail-closed without stale success');
  return deepFreeze(issues.sort(compareText));
}

function unquotedSqlTokens(statement: string): readonly string[] {
  const tokens: string[] = [];
  for (let index = 0; index < statement.length;) {
    const character = statement[index];
    const next = statement[index + 1];
    if (character === '-' && next === '-') {
      index += 2;
      while (index < statement.length && statement[index] !== '\n' && statement[index] !== '\r') index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      const end = statement.indexOf('*/', index + 2);
      index = end === -1 ? statement.length : end + 2;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      const quote = character;
      index += 1;
      while (index < statement.length) {
        if (statement[index] !== quote) {
          index += 1;
          continue;
        }
        if (statement[index + 1] === quote) {
          index += 2;
          continue;
        }
        index += 1;
        break;
      }
      continue;
    }
    if (character === '[') {
      const end = statement.indexOf(']', index + 1);
      index = end === -1 ? statement.length : end + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(character)) {
      const start = index;
      index += 1;
      while (index < statement.length && /[A-Za-z0-9_]/.test(statement[index])) index += 1;
      tokens.push(statement.slice(start, index).toLowerCase());
      continue;
    }
    index += 1;
  }
  return tokens;
}

export function assertSafeD1Statement(statement: string): void {
  const tokens = unquotedSqlTokens(statement);
  if (tokens.includes('delete')) throw new Error('Unsafe D1 DELETE is forbidden; use a tombstone');
  for (const identifier of ['portal_metadata', 'record_id', 'fence', 'metadata_json', 'digest', 'tombstoned']) {
    if (tokens.includes(identifier)) throw new Error(`D1 identifier must be quoted: ${identifier}`);
  }
}

function isJsonValueOnPath(value: unknown, active: WeakSet<object>): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object') return false;
  if (active.has(value)) return false;
  active.add(value);
  let valid: boolean;
  if (Array.isArray(value)) {
    valid = true;
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value) || !isJsonValueOnPath(value[index], active)) {
        valid = false;
        break;
      }
    }
  } else {
    const prototype: unknown = Object.getPrototypeOf(value);
    valid = (prototype === Object.prototype || prototype === null)
      && Object.values(value as Record<string, unknown>).every((entry) => isJsonValueOnPath(entry, active));
  }
  active.delete(value);
  return valid;
}

export function isJsonValue(value: unknown): value is JsonValue {
  return isJsonValueOnPath(value, new WeakSet());
}

export type ObservabilityEvent = {
  readonly eventId: string;
  readonly sequence: number;
  readonly level: 'error' | 'info';
  readonly code: string;
  readonly details: JsonValue;
};

export function createObservabilityEvent(
  sequence: number,
  level: ObservabilityEvent['level'],
  code: string,
  details: JsonValue,
): ObservabilityEvent {
  if (!Number.isSafeInteger(sequence) || sequence < 0) throw new Error('Telemetry sequence must be a non-negative safe integer');
  const identity: JsonValue = { sequence, level, code, details };
  return deepFreeze({ eventId: `portal-event-${stableHash(identity)}`, sequence, level, code, details });
}

export function serializeObservabilityEvent(event: ObservabilityEvent): string {
  return canonicalString(event);
}

export function normalizeKernelError(code: string, message: string, status = 503): Response {
  const safeStatus = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
  return Response.json({ ok: false, error: { code, message } }, { status: safeStatus });
}

export async function executeFailClosed<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch {
    throw new Error('Kernel operation failed closed');
  }
}
