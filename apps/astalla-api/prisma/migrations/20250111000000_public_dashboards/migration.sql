-- CreateTable
CREATE TABLE "PublicDashboard" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "propertyId" TEXT,
    "title" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "accessToken" TEXT,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicDashboard_subdomain_key" ON "PublicDashboard"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "PublicDashboard_accessToken_key" ON "PublicDashboard"("accessToken");
