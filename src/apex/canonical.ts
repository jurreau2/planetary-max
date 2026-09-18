import type { JsonValue } from './types.ts';

function canonicalize(value: JsonValue): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Apex values must contain only finite numbers');
    return Object.is(value, -0) ? '0' : JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }
  const record = value as { readonly [key: string]: JsonValue };
  const fields = Object.keys(record)
    .sort(compareText)
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`);
  return `{${fields.join(',')}}`;
}

export function canonicalString(value: JsonValue): string {
  return canonicalize(value);
}

export function stableHash(value: JsonValue): string {
  const input = canonicalString(value);
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

export function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function sortedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort(compareText));
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    const children: readonly unknown[] = Array.isArray(value)
      ? value
      : Object.values(value as Record<string, unknown>);
    for (const child of children) deepFreeze(child);
  }
  return value;
}

export function requireNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) throw new Error(`${field} must not be empty`);
}

export function requireFence(value: number, field = 'fence'): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative safe integer`);
  }
}
