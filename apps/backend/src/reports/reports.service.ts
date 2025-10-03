import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { WeeklyReportResponse } from "@shared/api";

import { PrismaService } from "../prisma/prisma.service";
import { MockIntegrationsService } from "../providers/mock-integrations.service";

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly hasDatabase: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly integrations: MockIntegrationsService
  ) {
    this.hasDatabase = Boolean(this.configService.get<string>("database.url"));
  }

  async getWeeklyReport(useMock = false): Promise<WeeklyReportResponse> {
    if (useMock || !this.hasDatabase) {
      return this.integrations.getWeeklyReport();
    }

    try {
      const snapshot = await this.prisma.reportSnapshot.findFirst({
        orderBy: { weekStart: "desc" }
      });

      if (!snapshot) {
        throw new Error("No report snapshots available");
      }

      const payload = (snapshot.payload as Record<string, unknown>) ?? {};
      const highlights = Array.isArray(payload?.highlights) ? (payload.highlights as string[]) : [];
      const watchlist = Array.isArray(payload?.watchlist) ? (payload.watchlist as WeeklyReportResponse["watchlist"]) : [];

      return {
        generatedAt: snapshot.weekStart.toISOString(),
        highlights,
        watchlist
      };
    } catch (error) {
      this.logger.warn(`Falling back to mock weekly report: ${(error as Error).message}`);
      return this.integrations.getWeeklyReport();
    }
  }
}
