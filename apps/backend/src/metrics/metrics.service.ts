import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CostMetricsResponse, OccupancyMetricsResponse, PipelineMetricsResponse } from "@shared/api";
import { addDays, startOfDay, subDays } from "date-fns";

import { PrismaService } from "../prisma/prisma.service";
import { MockIntegrationsService } from "../providers/mock-integrations.service";

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly hasDatabase: boolean;
  private readonly devMocksEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly integrations: MockIntegrationsService
  ) {
    this.hasDatabase = Boolean(this.configService.get<string>("database.url"));
    this.devMocksEnabled = this.configService.get<boolean>("devMocks") ?? false;
  }

  async getOccupancy(propertyId?: string, windowParam?: string, useMock = false): Promise<OccupancyMetricsResponse> {
    if (!propertyId) {
      throw new BadRequestException("propertyId is required to compute occupancy metrics");
    }

    const windowDays = this.resolveWindow(windowParam);

    if (useMock) {
      this.ensureDevMocksEnabled("Occupancy metrics");
      return this.integrations.getOccupancyMetrics(propertyId, String(windowDays));
    }

    if (!this.hasDatabase) {
      this.ensureDevMocksEnabled("Occupancy metrics");
      return this.integrations.getOccupancyMetrics(propertyId, String(windowDays));
    }

    try {
      return await this.computeOccupancy(propertyId, windowDays);
    } catch (error) {
      this.logger.warn(`Falling back to mock occupancy metrics: ${(error as Error).message}`);
      if (!this.devMocksEnabled) {
        throw error instanceof Error ? error : new Error(String(error));
      }
      return this.integrations.getOccupancyMetrics(propertyId, String(windowDays));
    }
  }

  async getPipeline(propertyId?: string, windowParam?: string, useMock = false): Promise<PipelineMetricsResponse> {
    if (!propertyId) {
      throw new BadRequestException("propertyId is required to compute pipeline metrics");
    }

    const windowDays = this.resolveWindow(windowParam);

    if (useMock) {
      this.ensureDevMocksEnabled("Pipeline metrics");
      return this.integrations.getPipelineMetrics(propertyId, String(windowDays));
    }

    if (!this.hasDatabase) {
      this.ensureDevMocksEnabled("Pipeline metrics");
      return this.integrations.getPipelineMetrics(propertyId, String(windowDays));
    }

    try {
      return await this.computePipeline(propertyId, windowDays);
    } catch (error) {
      this.logger.warn(`Falling back to mock pipeline metrics: ${(error as Error).message}`);
      if (!this.devMocksEnabled) {
        throw error instanceof Error ? error : new Error(String(error));
      }
      return this.integrations.getPipelineMetrics(propertyId, String(windowDays));
    }
  }

  async getCost(propertyId?: string, windowParam?: string, useMock = false): Promise<CostMetricsResponse> {
    if (!propertyId) {
      throw new BadRequestException("propertyId is required to compute cost metrics");
    }

    const windowDays = this.resolveWindow(windowParam);

    if (useMock) {
      this.ensureDevMocksEnabled("Cost metrics");
      return this.integrations.getCostMetrics(propertyId, String(windowDays));
    }

    if (!this.hasDatabase) {
      this.ensureDevMocksEnabled("Cost metrics");
      return this.integrations.getCostMetrics(propertyId, String(windowDays));
    }

    try {
      return await this.computeCost(propertyId, windowDays);
    } catch (error) {
      this.logger.warn(`Falling back to mock cost metrics: ${(error as Error).message}`);
      if (!this.devMocksEnabled) {
        throw error instanceof Error ? error : new Error(String(error));
      }
      return this.integrations.getCostMetrics(propertyId, String(windowDays));
    }
  }

  private resolveWindow(windowParam?: string | number) {
    const parsed = typeof windowParam === "string" ? Number.parseInt(windowParam, 10) : windowParam;
    if (!parsed || Number.isNaN(parsed)) {
      return 30;
    }
    return Math.max(7, Math.min(parsed, 90));
  }

  private async computeOccupancy(propertyId: string, windowDays: number): Promise<OccupancyMetricsResponse> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        unitCount: true,
        units: { where: { rentable: true }, select: { id: true } }
      }
    });

    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`);
    }

    const totalUnits = property.unitCount ?? property.units.length;
    const today = startOfDay(new Date());
    const windowEnd = addDays(today, windowDays);

    const [activeLeases, preleases, upcomingMoveOuts, approvedApps, snapshots] = await Promise.all([
      this.prisma.lease.count({
        where: {
          propertyId,
          status: { in: ["ACTIVE", "NOTICE"] },
          startDate: { lte: today },
          OR: [{ endDate: null }, { endDate: { gt: today } }]
        }
      }),
      this.prisma.lease.count({
        where: {
          propertyId,
          status: "PENDING",
          startDate: { lte: today }
        }
      }),
      this.prisma.lease.count({
        where: {
          propertyId,
          status: { in: ["ACTIVE", "NOTICE"] },
          OR: [
            { endDate: { gte: today, lte: windowEnd } },
            { moveOutAt: { gte: today, lte: windowEnd } }
          ]
        }
      }),
      this.prisma.application.count({
        where: {
          propertyId,
          status: "APPROVED",
          approvedAt: { not: null, gte: today, lte: windowEnd }
        }
      }),
      this.prisma.availabilitySnapshot.findMany({
        where: { propertyId },
        orderBy: { at: "asc" },
        take: Math.max(windowDays, 30)
      })
    ]);

    const unitsOccupied = activeLeases + preleases;
    const occupancyRate = totalUnits > 0 ? unitsOccupied / totalUnits : 0;

    const anticipated = totalUnits > 0
      ? Math.max(0, Math.min(1, (unitsOccupied + approvedApps - upcomingMoveOuts) / totalUnits))
      : 0;

    const trend = snapshots.map((snapshot) => {
      const occupiedFromSnapshot = snapshot.occupiedUnits ?? (snapshot.totalUnits ?? totalUnits) - snapshot.availableUnits;
      const denominator = snapshot.totalUnits ?? totalUnits;
      const value = denominator > 0 ? occupiedFromSnapshot / denominator : occupancyRate;
      return {
        timestamp: snapshot.at.toISOString(),
        value: Number(value.toFixed(4))
      };
    });

    const change = trend.length > 1 ? trend[trend.length - 1].value - trend[0].value : 0;

    return {
      occupancyRate: Number(occupancyRate.toFixed(4)),
      change: Number(change.toFixed(4)),
      unitsOccupied,
      totalUnits,
      trend,
      anticipatedOccupancy: Number(anticipated.toFixed(4)),
      upcomingMoveIns: approvedApps,
      upcomingMoveOuts,
      approvedApplications: approvedApps
    };
  }

  private async computePipeline(propertyId: string, windowDays: number): Promise<PipelineMetricsResponse> {
    const today = startOfDay(new Date());
    const start = subDays(today, windowDays - 1);

    const [newLeads, tours, applicationsStarted, applicationsApproved, events] = await Promise.all([
      this.prisma.lead.count({
        where: { propertyId, createdAt: { gte: start } }
      }),
      this.prisma.leadEvent.count({
        where: {
          propertyId,
          type: { in: ["TOUR_SCHEDULED", "TOUR_COMPLETED"] },
          occurredAt: { gte: start }
        }
      }),
      this.prisma.application.count({
        where: { propertyId, submittedAt: { gte: start } }
      }),
      this.prisma.application.count({
        where: {
          propertyId,
          status: "APPROVED",
          approvedAt: { not: null, gte: start }
        }
      }),
      this.prisma.leadEvent.findMany({
        where: { propertyId, occurredAt: { gte: start } },
        orderBy: { occurredAt: "asc" },
        select: { occurredAt: true, type: true }
      })
    ]);

    const trendMap = new Map<string, number>();
    for (const event of events) {
      const day = startOfDay(event.occurredAt).toISOString();
      if (!trendMap.has(day)) {
        trendMap.set(day, 0);
      }
      if (event.type === "APPLICATION_APPROVED" || event.type === "LEASE_SIGNED") {
        trendMap.set(day, (trendMap.get(day) ?? 0) + 1);
      }
    }

    const trend = Array.from(trendMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([timestamp, value]) => ({ timestamp, value }));

    if (trend.length === 0) {
      trend.push({ timestamp: today.toISOString(), value: applicationsApproved });
    }

    return {
      newLeads,
      toursScheduled: tours,
      applicationsStarted,
      applicationsApproved,
      trend
    };
  }

  private async computeCost(propertyId: string, windowDays: number): Promise<CostMetricsResponse> {
    const today = startOfDay(new Date());
    const start = subDays(today, windowDays - 1);
    const previousStart = subDays(start, windowDays);
    const previousEnd = subDays(start, 1);

    const [spend, conversions, previousSpend] = await Promise.all([
      this.prisma.channelSpend.findMany({
        where: { propertyId, day: { gte: start, lte: today } },
        orderBy: { day: "asc" }
      }),
      this.prisma.conversionEvent.findMany({
        where: { propertyId, day: { gte: start, lte: today } }
      }),
      this.prisma.channelSpend.findMany({
        where: { propertyId, day: { gte: previousStart, lte: previousEnd } }
      })
    ]);

    const totalSpend = spend.reduce((sum, entry) => sum + Number(entry.cost ?? 0), 0);
    const previousTotalSpend = previousSpend.reduce((sum, entry) => sum + Number(entry.cost ?? 0), 0);
    const totalLeads = conversions
      .filter((event) => event.type === "LEAD" || event.type === "CONVERSION" || event.type === "APPLICATION")
      .reduce((sum, event) => sum + event.count, 0);

    const costPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const spendChange = previousTotalSpend > 0 ? (totalSpend - previousTotalSpend) / previousTotalSpend : 0;

    const trendMap = new Map<string, { spend: number; leads: number }>();
    for (const entry of spend) {
      const key = startOfDay(entry.day).toISOString();
      const bucket = trendMap.get(key) ?? { spend: 0, leads: 0 };
      bucket.spend += Number(entry.cost ?? 0);
      trendMap.set(key, bucket);
    }
    for (const conversion of conversions) {
      const key = startOfDay(conversion.day).toISOString();
      if (!trendMap.has(key)) {
        trendMap.set(key, { spend: 0, leads: 0 });
      }
      if (conversion.type === "LEAD" || conversion.type === "CONVERSION" || conversion.type === "APPLICATION") {
        const bucket = trendMap.get(key)!;
        bucket.leads += conversion.count;
        trendMap.set(key, bucket);
      }
    }

    const trend = Array.from(trendMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([timestamp, bucket]) => ({
        timestamp,
        value: bucket.leads > 0 ? Number((bucket.spend / bucket.leads).toFixed(2)) : 0
      }));

    if (trend.length === 0) {
      trend.push({ timestamp: today.toISOString(), value: Number(costPerLead.toFixed(2)) });
    }

    return {
      costPerLead: Number(costPerLead.toFixed(2)),
      marketingSpend: Number(totalSpend.toFixed(2)),
      spendChange: Number(spendChange.toFixed(4)),
      trend
    };
  }

  private ensureDevMocksEnabled(feature: string) {
    if (!this.devMocksEnabled) {
      throw new ServiceUnavailableException(
        `${feature} mocks are disabled. Set DEV_MOCKS=true to enable developer mock data.`
      );
    }
  }
}
