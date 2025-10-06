-- CreateEnum
CREATE TYPE "ScriptStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "ProviderScript" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ScriptStatus" NOT NULL DEFAULT 'DRAFT',
    "code" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderScript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceActionLog" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "latencyMs" INTEGER,
    "request" JSONB,
    "response" JSONB,
    "error" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderScript_sourceId_key" ON "ProviderScript"("sourceId");

-- CreateIndex
CREATE INDEX "SourceActionLog_sourceId_createdAt_idx" ON "SourceActionLog"("sourceId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProviderScript" ADD CONSTRAINT "ProviderScript_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceActionLog" ADD CONSTRAINT "SourceActionLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
