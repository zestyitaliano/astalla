DROP INDEX IF EXISTS "DataTable_orgId_name_idx";

-- Deduplicate any existing tables that currently share a name within the same org.
-- We keep the earliest table name as-is and rename the later duplicates so that
-- enforcing the new constraint succeeds without manual intervention.
WITH duplicates AS (
  SELECT
    id,
    "name",
    ROW_NUMBER() OVER (PARTITION BY "orgId", "name" ORDER BY "createdAt", id) AS rn
  FROM "DataTable"
)
UPDATE "DataTable" AS dt
SET "name" = duplicates."name" || ' (duplicate ' || SUBSTR(dt.id::text, 1, 8) || ')'
FROM duplicates
WHERE dt.id = duplicates.id
  AND duplicates.rn > 1;

-- Enforce unique table names per organization
ALTER TABLE "DataTable"
ADD CONSTRAINT "DataTable_orgId_name_key" UNIQUE ("orgId", "name");
