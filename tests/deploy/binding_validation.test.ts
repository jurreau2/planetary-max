import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { D1_BINDING_NAME, D1_TOMBSTONE_SQL, D1_UPSERT_SQL } from '../../src/bindings/d1.ts';
import { KV_BINDING_NAME } from '../../src/bindings/kv.ts';
import { R2_BINDING_NAME } from '../../src/bindings/r2.ts';
import { assertSafeD1Statement, validateBindingManifest } from '../../src/deploy/validation.ts';

const BINDING_SECTION_NAMES = Object.freeze({
  r2_buckets: R2_BINDING_NAME,
  kv_namespaces: KV_BINDING_NAME,
  d1_databases: D1_BINDING_NAME,
});

function configuredBindings(source: string): ReadonlyMap<string, ReadonlySet<string>> {
  const scopes = new Map<string, Set<string>>([['default', new Set()]]);
  for (const rawLine of source.split(/\r?\n/)) {
    const environment = /^\[{1,2}env\.([^.\]]+)/.exec(rawLine.trim());
    if (environment !== null) scopes.set(`env.${environment[1]}`, new Set());
  }
  let active: { readonly scope: string; readonly section: keyof typeof BINDING_SECTION_NAMES } | undefined;
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, '').trim();
    const section = /^\[\[(?:(env\.[^.]+)\.)?(r2_buckets|kv_namespaces|d1_databases)\]\]$/.exec(line);
    if (section !== null) {
      active = { scope: section[1] ?? 'default', section: section[2] as keyof typeof BINDING_SECTION_NAMES };
      if (!scopes.has(active.scope)) scopes.set(active.scope, new Set());
      continue;
    }
    if (line.startsWith('[')) {
      active = undefined;
      continue;
    }
    const binding = /^binding\s*=\s*"([^"]+)"$/.exec(line);
    if (binding !== null && active !== undefined && binding[1] === BINDING_SECTION_NAMES[active.section]) {
      scopes.get(active.scope)?.add(binding[1]);
    }
  }
  return scopes;
}

test('binding names match the Worker contract exactly', () => {
  assert.deepEqual([R2_BINDING_NAME, KV_BINDING_NAME, D1_BINDING_NAME], ['PORTAL_R2', 'PORTAL_KV', 'PORTAL_D1']);
  assert.deepEqual(validateBindingManifest({ r2: R2_BINDING_NAME, kv: KV_BINDING_NAME, d1: D1_BINDING_NAME }), []);
});

test('binding validator rejects mismatched names', () => {
  assert.equal(validateBindingManifest({ r2: 'R2', kv: 'KV', d1: 'D1' }).length, 3);
});

test('Wrangler declares every required binding', () => {
  const source = readFileSync(join(process.cwd(), 'wrangler.toml'), 'utf8');
  const expected = new Set([R2_BINDING_NAME, KV_BINDING_NAME, D1_BINDING_NAME]);
  const scopes = configuredBindings(source);
  assert.ok(scopes.size > 0);
  for (const bindings of scopes.values()) {
    assert.deepEqual(bindings, expected);
  }
});

test('Wrangler parser retains environments without binding tables', () => {
  const scopes = configuredBindings('[env.staging.vars]\nPORTAL_OS_PHASE = "16"');
  assert.deepEqual([...scopes.keys()], ['default', 'env.staging']);
  assert.equal(scopes.get('env.staging')?.size, 0);
});

test('D1 statements quote identifiers', () => {
  assert.doesNotThrow(() => assertSafeD1Statement(D1_UPSERT_SQL));
  assert.doesNotThrow(() => assertSafeD1Statement(D1_TOMBSTONE_SQL));
});

test('unsafe D1 deletes are rejected', () => {
  assert.throws(() => assertSafeD1Statement('DELETE FROM "portal_metadata"'), /tombstone/);
  assert.throws(() => assertSafeD1Statement('DELETE/**/FROM "portal_metadata"'), /tombstone/);
  assert.throws(
    () => assertSafeD1Statement(`CREATE TRIGGER "cleanup" AFTER UPDATE ON "portal_metadata" BEGIN SELECT '--'; DELETE FROM "portal_metadata"; END`),
    /tombstone/,
  );
  assert.doesNotThrow(() => assertSafeD1Statement(`SELECT '-- DELETE FROM portal_metadata'`));
});

test('qualified D1 identifiers must still be quoted', () => {
  assert.throws(() => assertSafeD1Statement('SELECT alias.record_id FROM "portal_metadata" AS alias'), /record_id/);
});
