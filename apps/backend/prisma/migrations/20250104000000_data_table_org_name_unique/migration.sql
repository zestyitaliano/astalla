-- Drop the existing non-unique index to replace it with a unique constraint
DROP INDEX IF EXISTS "DataTable_orgId_name_idx";

-- Enforce unique table names per organization
ALTER TABLE "DataTable"
ADD CONSTRAINT "DataTable_orgId_name_key" UNIQUE ("orgId", "name");
