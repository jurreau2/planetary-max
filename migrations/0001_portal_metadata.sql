CREATE TABLE IF NOT EXISTS "portal_metadata" (
  "record_id" TEXT PRIMARY KEY NOT NULL,
  "fence" INTEGER NOT NULL CHECK ("fence" >= 0),
  "metadata_json" TEXT NOT NULL,
  "digest" TEXT NOT NULL,
  "tombstoned" INTEGER NOT NULL DEFAULT 0 CHECK ("tombstoned" IN (0, 1))
);

CREATE INDEX IF NOT EXISTS "portal_metadata_fence_idx"
ON "portal_metadata" ("fence");
