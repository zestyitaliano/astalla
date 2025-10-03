import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AlertsResponse } from "@shared/api";

import { PrismaService } from "../prisma/prisma.service";
import { MockIntegrationsService } from "../providers/mock-integrations.service";

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private readonly hasDatabase: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly integrations: MockIntegrationsService
  ) {
    this.hasDatabase = Boolean(this.configService.get<string>("database.url"));
  }

  async getAlerts(propertyId?: string, useMock = false): Promise<AlertsResponse> {
    if (!propertyId) {
      return { alerts: [] };
    }

    if (useMock || !this.hasDatabase) {
      return this.integrations.getAlerts(propertyId);
    }

    try {
      const alerts = await this.prisma.alert.findMany({
        where: { propertyId },
        orderBy: { at: "desc" },
        take: 20
      });

      return {
        alerts: alerts.map((alert) => ({
          id: alert.id,
          label: alert.type,
          detail: alert.message,
          severity: this.mapSeverity(alert.severity),
          occurredAt: alert.at.toISOString()
        }))
      };
    } catch (error) {
      this.logger.warn(`Falling back to mock alerts: ${(error as Error).message}`);
      return this.integrations.getAlerts(propertyId);
    }
  }

  private mapSeverity(severity: string) {
    switch (severity) {
      case "CRITICAL":
      case "HIGH":
        return "high";
      case "LOW":
        return "low";
      default:
        return "medium";
    }
  }
}
