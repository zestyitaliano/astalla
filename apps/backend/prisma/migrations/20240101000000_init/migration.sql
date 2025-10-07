-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ORG_ADMIN', 'REGIONAL', 'PROPERTY', 'MARKETING');

-- CreateEnum
CREATE TYPE "SourceAccountType" AS ENUM ('ENTRATA', 'GOOGLE_ADS', 'GA4', 'GBP', 'WORDPRESS');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('STARTED', 'SUBMITTED', 'APPROVED', 'DENIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('PENDING', 'ACTIVE', 'NOTICE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReviewProvider" AS ENUM ('GBP');

-- CreateEnum
CREATE TYPE "ColumnType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'REFERENCE');

-- CreateTable
CREATE TABLE "Org" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "name" TEXT,
    "passwordHash" TEXT,
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "propertyCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "unitCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOrgRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "propertyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserOrgRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceAccount" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "SourceAccountType" NOT NULL,
    "credential" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gclid" TEXT,
    "gbraid" TEXT,
    "wbraid" TEXT,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "applicationId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "LeaseStatus" NOT NULL,
    "moveOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "rentable" BOOLEAN NOT NULL DEFAULT true,
    "rent" DECIMAL(12, 2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySnapshot" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "availableUnits" INTEGER NOT NULL,
    "occupiedUnits" INTEGER,
    "totalUnits" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelSpend" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL,
    "campaignId" TEXT,
    "cost" DECIMAL(14, 4) NOT NULL,
    "currency" TEXT DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelSpend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversionEvent" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "leadId" TEXT,
    "day" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "gclid" TEXT,
    "gbraid" TEXT,
    "wbraid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "provider" "ReviewProvider" NOT NULL DEFAULT 'GBP',
    "authorName" TEXT,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "reviewerEmail" TEXT,
    "reviewerPhoto" TEXT,
    "responseText" TEXT,
    "respondedAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentimentSummary" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "posPct" DOUBLE PRECISION NOT NULL,
    "negPct" DOUBLE PRECISION NOT NULL,
    "topics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentimentSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIThreshold" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "orgId" TEXT,
    "kpi" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "warnBelow" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KPIThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSnapshot" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "occupancy" DOUBLE PRECISION NOT NULL,
    "cpl" DOUBLE PRECISION,
    "cpls" DOUBLE PRECISION,
    "red" BOOLEAN NOT NULL DEFAULT false,
    "watch" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT,
    "propertyId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assigneeId" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SOP" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SOP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingItem" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "propertyId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeJob" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "propertyId" TEXT,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtlCursor" (
    "id" TEXT NOT NULL,
    "source" "SourceAccountType" NOT NULL,
    "scope" TEXT NOT NULL,
    "cursor" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtlCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataTable" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableColumn" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ColumnType" NOT NULL,
    "position" INTEGER NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableRow" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableCell" (
    "id" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "value" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableView" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableAudit" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Property_propertyCode_key" ON "Property"("propertyCode");

-- CreateIndex
CREATE UNIQUE INDEX "UserOrgRole_userId_orgId_role_propertyId_key" ON "UserOrgRole"("userId", "orgId", "role", "propertyId");

-- CreateIndex
CREATE INDEX "idx_source_account_property_type" ON "SourceAccount"("propertyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_propertyId_externalId_key" ON "Lead"("propertyId", "externalId");

-- CreateIndex
CREATE INDEX "idx_lead_property_created" ON "Lead"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_lead_event_property_time" ON "LeadEvent"("propertyId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_leadId_key" ON "Application"("leadId");

-- CreateIndex
CREATE INDEX "idx_application_property_submitted" ON "Application"("propertyId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lease_leadId_key" ON "Lease"("leadId");

-- CreateIndex
CREATE INDEX "idx_lease_property_start" ON "Lease"("propertyId", "startDate");

-- CreateIndex
CREATE INDEX "idx_lease_property_end" ON "Lease"("propertyId", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_unit_property_code" ON "Unit"("propertyId", "unitCode");

-- CreateIndex
CREATE INDEX "idx_availability_property_at" ON "AvailabilitySnapshot"("propertyId", "at");

-- CreateIndex
CREATE INDEX "idx_channel_spend_property_day" ON "ChannelSpend"("propertyId", "day");

-- CreateIndex
CREATE INDEX "idx_conversion_event_property_day" ON "ConversionEvent"("propertyId", "day");

-- CreateIndex
CREATE INDEX "idx_review_property_at" ON "Review"("propertyId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_sentiment_property_week" ON "SentimentSummary"("propertyId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "KPIThreshold_propertyId_kpi_key" ON "KPIThreshold"("propertyId", "kpi");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_report_property_week" ON "ReportSnapshot"("propertyId", "weekStart");

-- CreateIndex
CREATE INDEX "idx_alert_property_at" ON "Alert"("propertyId", "at");

-- CreateIndex
CREATE INDEX "DataTable_orgId_name_idx" ON "DataTable"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TableColumn_tableId_slug_key" ON "TableColumn"("tableId", "slug");

-- CreateIndex
CREATE INDEX "TableColumn_tableId_position_idx" ON "TableColumn"("tableId", "position");

-- CreateIndex
CREATE INDEX "TableRow_tableId_position_idx" ON "TableRow"("tableId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TableCell_rowId_columnId_key" ON "TableCell"("rowId", "columnId");

-- CreateIndex
CREATE INDEX "TableView_tableId_name_idx" ON "TableView"("tableId", "name");

-- CreateIndex
CREATE INDEX "TableAudit_tableId_createdAt_idx" ON "TableAudit"("tableId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_etl_source_scope" ON "EtlCursor"("source", "scope");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrgRole" ADD CONSTRAINT "UserOrgRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrgRole" ADD CONSTRAINT "UserOrgRole_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrgRole" ADD CONSTRAINT "UserOrgRole_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceAccount" ADD CONSTRAINT "SourceAccount_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySnapshot" ADD CONSTRAINT "AvailabilitySnapshot_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelSpend" ADD CONSTRAINT "ChannelSpend_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentimentSummary" ADD CONSTRAINT "SentimentSummary_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIThreshold" ADD CONSTRAINT "KPIThreshold_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIThreshold" ADD CONSTRAINT "KPIThreshold_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSnapshot" ADD CONSTRAINT "ReportSnapshot_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SOP" ADD CONSTRAINT "SOP_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingItem" ADD CONSTRAINT "BillingItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingItem" ADD CONSTRAINT "BillingItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeJob" ADD CONSTRAINT "ScrapeJob_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ScrapeJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableColumn" ADD CONSTRAINT "TableColumn_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DataTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableRow" ADD CONSTRAINT "TableRow_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DataTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableCell" ADD CONSTRAINT "TableCell_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "TableRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableCell" ADD CONSTRAINT "TableCell_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "TableColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableView" ADD CONSTRAINT "TableView_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DataTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
