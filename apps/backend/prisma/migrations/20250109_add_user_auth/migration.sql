-- Add user authentication fields and constraints
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'ORG_ADMIN';

UPDATE "User"
SET "passwordHash" = COALESCE(
  NULLIF("passwordHash", ''),
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Yg1koRaSPo6e7iT730cdpShypHbOW'
);

ALTER TABLE "User"
  ALTER COLUMN "passwordHash" SET NOT NULL;

-- Seed placeholder:
-- -- Example admin bootstrap user
-- -- INSERT INTO "User" ("id", "email", "passwordHash", "role") VALUES (...);
