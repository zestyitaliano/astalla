import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AlertsResponse } from "@shared/api";

import { PrismaService } from "../prisma/prisma.service";
import { MockIntegrationsService } from "../providers/mock-integrations.service";

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
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

  async getAlerts(propertyId?: string, useMock = false): Promise<AlertsResponse> {
    if (!propertyId) {
      return { alerts: [] };
    }

    if (useMock) {
      this.ensureDevMocksEnabled("Alerts");
      return this.integrations.getAlerts(propertyId);
    }

    if (!this.hasDatabase) {
      this.ensureDevMocksEnabled("Alerts");
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
      if (!this.devMocksEnabled) {
        throw error instanceof Error ? error : new Error(String(error));
      }
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

  private ensureDevMocksEnabled(feature: string) {
    if (!this.devMocksEnabled) {
      throw new ServiceUnavailableException(
        `${feature} mocks are disabled. Set DEV_MOCKS=true to enable developer mock data.`
      );
    }
  }
}
