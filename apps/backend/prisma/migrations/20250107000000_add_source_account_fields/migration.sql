-- Add optional metadata fields to SourceAccount
ALTER TABLE "SourceAccount"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "status" TEXT,
  ADD COLUMN "lastSuccessAt" TIMESTAMP(3),
  ADD COLUMN "lastErrorAt" TIMESTAMP(3),
  ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;
