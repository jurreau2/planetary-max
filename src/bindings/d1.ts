import { canonicalString, requireFence, requireNonEmpty, stableHash } from '../apex/canonical.ts';
import type { JsonValue } from '../apex/types.ts';

export const D1_BINDING_NAME = 'PORTAL_D1';

export type D1RunResult = {
  readonly success: boolean;
  readonly meta?: { readonly changes?: number };
};
export type D1PreparedBinding = {
  bind(...values: readonly unknown[]): D1PreparedBinding;
  run(): Promise<D1RunResult>;
};
export type D1DatabaseBinding = {
  prepare(query: string): D1PreparedBinding;
};

export type D1MetadataWrite = {
  readonly recordId: string;
  readonly fence: number;
  readonly metadata: JsonValue;
};

export const D1_UPSERT_SQL = `INSERT INTO "portal_metadata" ("record_id", "fence", "metadata_json", "digest", "tombstoned")
VALUES (?1, ?2, ?3, ?4, 0)
ON CONFLICT ("record_id") DO UPDATE SET
  "fence" = excluded."fence",
  "metadata_json" = excluded."metadata_json",
  "digest" = excluded."digest",
  "tombstoned" = 0
WHERE excluded."fence" > "portal_metadata"."fence"`;

export const D1_TOMBSTONE_SQL = `INSERT INTO "portal_metadata" ("record_id", "fence", "metadata_json", "digest", "tombstoned")
VALUES (?1, ?2, ?3, ?4, 1)
ON CONFLICT ("record_id") DO UPDATE SET
  "fence" = excluded."fence",
  "metadata_json" = excluded."metadata_json",
  "digest" = excluded."digest",
  "tombstoned" = 1
WHERE excluded."fence" > "portal_metadata"."fence"`;

function validateWrite(input: D1MetadataWrite, expectedFence: number): void {
  requireNonEmpty(input.recordId, 'recordId');
  requireFence(input.fence);
  requireFence(expectedFence, 'expectedFence');
  if (input.fence !== expectedFence) throw new Error('D1 metadata write fence mismatch');
}

async function runWrite(database: D1DatabaseBinding, sql: string, input: D1MetadataWrite): Promise<void> {
  const metadataJson = canonicalString(input.metadata);
  const digest = stableHash({ recordId: input.recordId, fence: input.fence, metadata: input.metadata });
  const result = await database.prepare(sql).bind(input.recordId, input.fence, metadataJson, digest).run();
  if (!result.success) throw new Error('D1 deterministic metadata write failed');
  if (result.meta?.changes !== 1) throw new Error('D1 metadata write was rejected by the active fence');
}

/** Upserts non-authoritative metadata only when a strictly newer fence is supplied. */
export async function writeD1Metadata(
  database: D1DatabaseBinding,
  input: D1MetadataWrite,
  expectedFence: number,
): Promise<void> {
  validateWrite(input, expectedFence);
  await runWrite(database, D1_UPSERT_SQL, input);
}

/** Represents removal exclusively as a deterministic tombstone; DELETE is never issued. */
export async function tombstoneD1Metadata(
  database: D1DatabaseBinding,
  input: D1MetadataWrite,
  expectedFence: number,
): Promise<void> {
  validateWrite(input, expectedFence);
  await runWrite(database, D1_TOMBSTONE_SQL, input);
}

export const D1_DURABILITY = Object.freeze({ authoritative: false, tombstoneOnly: true, deterministicWrites: true });
