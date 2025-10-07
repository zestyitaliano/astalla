import { Logger } from "@nestjs/common";
import { Prisma, ReviewProvider, SourceAccountType } from "@prisma/client";
import { createHash } from "crypto";

import type { PrismaService } from "../prisma/prisma.service";
import type { EntrataProvider } from "../providers/entrata.provider";
import type { Ga4Provider } from "../providers/ga4.provider";
import type { GoogleBusinessProvider } from "../providers/gbp.provider";
import type { GoogleAdsProvider } from "../providers/google-ads.provider";

interface EtlProcessorDependencies {
  prisma: PrismaService;
  decrypt: (value: unknown) => Record<string, unknown>;
  providers: {
    entrata: EntrataProvider;
    ga4: Ga4Provider;
    gbp: GoogleBusinessProvider;
    ads: GoogleAdsProvider;
  };
  logger?: Logger;
}

interface EtlJobPayload {
  sourceId: string;
  job: string;
}

let dependencies: EtlProcessorDependencies | null = null;

function toJsonInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) {
    return Prisma.JsonNull;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return String(value) as Prisma.InputJsonValue;
  }
}

export function configureEtlProcessor(deps: EtlProcessorDependencies) {
  dependencies = deps;
}

export async function processEtlJob(payload: EtlJobPayload) {
  if (!dependencies) {
    throw new Error("ETL processor has not been configured");
  }

  const { prisma, decrypt, providers } = dependencies;
  const logger = dependencies.logger ?? new Logger("EtlProcessor");

  logger.log(`Processing ETL job ${payload.job} for source ${payload.sourceId}`);

  const source = await prisma.sourceAccount.findUnique({ where: { id: payload.sourceId } });
  if (!source) {
    logger.warn(`Source ${payload.sourceId} no longer exists. Skipping.`);
    return;
  }

  if (source.enabled === false) {
    logger.warn(`Source ${payload.sourceId} disabled. Skipping.`);
    return;
  }

  const credential = decrypt(source.credential ?? {});

  try {
    switch (source.type) {
      case SourceAccountType.ENTRATA:
        await syncEntrata(prisma, providers.entrata, source.propertyId, credential, logger);
        break;
      case SourceAccountType.GA4:
        await syncGa4(prisma, providers.ga4, source.propertyId, credential, logger);
        break;
      case SourceAccountType.GOOGLE_ADS:
        await syncGoogleAds(prisma, providers.ads, source.propertyId, credential, logger);
        break;
      case SourceAccountType.GBP:
        await syncGoogleBusiness(prisma, providers.gbp, source.propertyId, credential, logger);
        break;
      default:
        logger.warn(`No ETL implementation for source type ${source.type}`);
    }

    await prisma.sourceAccount.update({
      where: { id: source.id },
      data: {
        status: "CONNECTED",
        lastSuccessAt: new Date(),
        // Preserve lastErrorAt so teams can inspect historical issues
      }
    });

    logger.log(`ETL job ${payload.job} for source ${payload.sourceId} completed successfully`);
  } catch (error) {
    logger.error(`ETL job ${payload.job} for source ${payload.sourceId} failed`, error as Error);
    await prisma.sourceAccount.update({
      where: { id: source.id },
      data: {
        status: "ERROR",
        lastErrorAt: new Date()
      }
    });
    throw error;
  }
}

function ensureString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required credential field: ${field}`);
  }
  return value.trim();
}

async function syncEntrata(
  prisma: PrismaService,
  provider: EntrataProvider,
  propertyId: string,
  credential: Record<string, unknown>,
  logger: Logger
) {
  const apiKey = ensureString(credential.apiKey, "apiKey");
  const orgSlug = ensureString(credential.orgSlug, "orgSlug");
  const entrataPropertyIdRaw = credential.propertyId ?? credential.propertyExternalId;
  const entrataPropertyId = Number(entrataPropertyIdRaw);

  if (!Number.isFinite(entrataPropertyId)) {
    throw new Error("Entrata credential missing numeric propertyId");
  }

  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { leads } = await provider.fetchLeads(
    { apiKey, orgSlug },
    { propertyId: entrataPropertyId, from: start, to: now, perPage: 50 }
  );

  for (const lead of leads) {
    const externalId = String(lead.applicationId ?? `${entrataPropertyId}-${lead.createdOn ?? now.toISOString()}`);
    await prisma.lead.upsert({
      where: {
        propertyId_externalId: {
          propertyId,
          externalId
        }
      },
      update: {
        source: lead.leadSource ?? "Entrata"
      },
      create: {
        propertyId,
        externalId,
        source: lead.leadSource ?? "Entrata",
        createdAt: lead.createdOn ? new Date(lead.createdOn) : now,
        gclid: lead.leadSource ?? undefined
      }
    });
  }

  const { events } = await provider.fetchLeadEvents(
    { apiKey, orgSlug },
    { propertyId: entrataPropertyId, from: start, to: now, perPage: 50 }
  );

  for (const event of events) {
    const externalId = event.applicationId ? String(event.applicationId) : undefined;
    const timestamp = event.dateTime ? new Date(event.dateTime) : event.date ? new Date(event.date) : now;
    const deterministicId = hashId(`entrata:${propertyId}:${event.eventId ?? `${timestamp.getTime()}`}`);

    let leadId: string | undefined;
    if (externalId) {
      const lead = await prisma.lead.findUnique({
        where: {
          propertyId_externalId: {
            propertyId,
            externalId
          }
        }
      });
      leadId = lead?.id;
    }

    if (!leadId) {
      continue;
    }

    await prisma.leadEvent.upsert({
      where: { id: deterministicId },
      update: {
        leadId,
        type: event.type ?? "event",
        occurredAt: timestamp,
        meta: event.eventReason
          ? {
              reason: event.eventReason,
              agentName: event.agentName
            }
          : undefined
      },
      create: {
        id: deterministicId,
        propertyId,
        leadId,
        type: event.type ?? "event",
        occurredAt: timestamp,
        meta: event.eventReason
          ? {
              reason: event.eventReason,
              agentName: event.agentName
            }
          : undefined
      }
    });
  }

  logger.log(`Entrata sync wrote ${leads.length} leads and ${events.length} events for ${propertyId}`);
}

async function syncGa4(
  prisma: PrismaService,
  provider: Ga4Provider,
  propertyId: string,
  credential: Record<string, unknown>,
  logger: Logger
) {
  const accessToken = ensureString(credential.accessToken, "accessToken");
  const gaPropertyId = ensureString(credential.propertyId ?? credential.ga4PropertyId, "propertyId");
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const gaDate = formatGaDate(yesterday);

  const rows = await provider.runReport<{ dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }>(
    {
      accessToken,
      propertyId: gaPropertyId,
      body: {
        dimensions: [{ name: "date" }],
        metrics: [{ name: "totalUsers" }, { name: "conversions" }],
        dateRanges: [{ startDate: gaDate, endDate: gaDate }]
      }
    }
  );

  for (const row of rows) {
    const dimensionValue = row.dimensionValues?.[0]?.value ?? gaDate;
    const metricValues = row.metricValues ?? [];
    const totalUsers = Number(metricValues[0]?.value ?? "0");
    const conversions = Number(metricValues[1]?.value ?? "0");
    const day = parseGaDate(dimensionValue);

    await prisma.conversionEvent.upsert({
      where: { id: hashId(`ga4:${propertyId}:${dimensionValue}:total_users`) },
      update: { count: Math.round(totalUsers) },
      create: {
        id: hashId(`ga4:${propertyId}:${dimensionValue}:total_users`),
        propertyId,
        day,
        type: "ga4_total_users",
        count: Math.round(totalUsers)
      }
    });

    await prisma.conversionEvent.upsert({
      where: { id: hashId(`ga4:${propertyId}:${dimensionValue}:conversions`) },
      update: { count: Math.round(conversions) },
      create: {
        id: hashId(`ga4:${propertyId}:${dimensionValue}:conversions`),
        propertyId,
        day,
        type: "ga4_conversions",
        count: Math.round(conversions)
      }
    });
  }

  logger.log(`GA4 sync recorded ${rows.length} daily rows for ${propertyId}`);
}

async function syncGoogleAds(
  prisma: PrismaService,
  provider: GoogleAdsProvider,
  propertyId: string,
  credential: Record<string, unknown>,
  logger: Logger
) {
  const accessToken = ensureString(credential.accessToken, "accessToken");
  const customerId = ensureString(credential.customerId ?? credential.loginCustomerId ?? credential.managerCustomerId, "customerId");
  const developerToken = typeof credential.developerToken === "string" ? credential.developerToken : undefined;
  const loginCustomerId = typeof credential.loginCustomerId === "string" ? credential.loginCustomerId : undefined;

  const query = [
    "SELECT segments.date, campaign.id, campaign.name, metrics.cost_micros",
    "FROM campaign",
    "WHERE segments.date DURING YESTERDAY",
    "LIMIT 25"
  ].join(" ");

  const rows = await provider.runQuery<GoogleAdsReportRow>({
    accessToken,
    customerId,
    loginCustomerId,
    developerToken,
    query
  });

  for (const row of rows) {
    const dayString = row?.segments?.date;
    if (!dayString) continue;

    const day = new Date(dayString);
    const campaignId = row?.campaign?.id ? String(row.campaign.id) : undefined;
    const costMicros = Number(row?.metrics?.cost_micros ?? row?.metrics?.costMicros ?? 0);
    const cost = costMicros / 1_000_000;

    await prisma.channelSpend.upsert({
      where: { id: hashId(`ads:${propertyId}:${dayString}:${campaignId ?? "all"}`) },
      update: { cost: new Prisma.Decimal(cost.toFixed(4)) },
      create: {
        id: hashId(`ads:${propertyId}:${dayString}:${campaignId ?? "all"}`),
        propertyId,
        day,
        channel: "google_ads",
        campaignId,
        cost: new Prisma.Decimal(cost.toFixed(4)),
        currency: "USD"
      }
    });
  }

  logger.log(`Google Ads sync processed ${rows.length} rows for ${propertyId}`);
}

async function syncGoogleBusiness(
  prisma: PrismaService,
  provider: GoogleBusinessProvider,
  propertyId: string,
  credential: Record<string, unknown>,
  logger: Logger
) {
  const accessToken = ensureString(credential.accessToken, "accessToken");
  const accountId = ensureString(credential.accountId, "accountId");
  const locationId = ensureString(credential.locationId, "locationId");

  const { reviews } = await provider.listReviews({
    accessToken,
    accountId,
    locationId
  });

  for (const review of reviews) {
    const reviewId = hashId(review.name ?? `${accountId}/${locationId}/${review.updateTime ?? review.createTime ?? Date.now()}`);
    const rating = normalizeRating(review.starRating);
    const createdAt = review.createTime ? new Date(review.createTime) : new Date();
    const clampedRating = Math.max(0, Math.min(5, Math.round(rating)));

    await prisma.review.upsert({
      where: { id: reviewId },
      update: {
        rating: clampedRating,
        text: review.comment ?? "",
        responseText: review.reviewReply?.comment ?? null,
        respondedAt: review.reviewReply?.updateTime ? new Date(review.reviewReply.updateTime) : null,
        rawPayload: toJsonInput(review)
      },
      create: {
        id: reviewId,
        propertyId,
        provider: ReviewProvider.GBP,
        authorName: review.reviewer?.displayName ?? (review.reviewer?.isAnonymous ? "Anonymous" : "Resident"),
        rating: clampedRating,
        text: review.comment ?? "",
        at: createdAt,
        responseText: review.reviewReply?.comment ?? null,
        respondedAt: review.reviewReply?.updateTime ? new Date(review.reviewReply.updateTime) : null,
        rawPayload: toJsonInput(review)
      }
    });
  }

  logger.log(`Google Business sync stored ${reviews.length} reviews for ${propertyId}`);
}

function hashId(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

function formatGaDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseGaDate(value: string) {
  if (/^\d{8}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    return new Date(Date.UTC(year, month - 1, day));
  }
  return new Date(value);
}

function normalizeRating(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
    const lookup: Record<string, number> = {
      ZERO: 0,
      ONE: 1,
      TWO: 2,
      THREE: 3,
      FOUR: 4,
      FIVE: 5
    };
    const upper = value.toUpperCase();
    if (upper in lookup) {
      return lookup[upper];
    }
  }
  return 0;
}

type GoogleAdsReportRow = {
  segments?: { date?: string };
  campaign?: { id?: string | number };
  metrics?: { cost_micros?: string | number; costMicros?: string | number };
};
