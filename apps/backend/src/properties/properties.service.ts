import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PropertiesResponse } from "@shared/api";

import { PrismaService } from "../prisma/prisma.service";
import { MockIntegrationsService } from "../providers/mock-integrations.service";

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);
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

  async list(useMock = false): Promise<PropertiesResponse> {
    if (useMock) {
      this.ensureDevMocksEnabled("Property catalog");
      return this.integrations.getProperties();
    }

    if (!this.hasDatabase) {
      this.ensureDevMocksEnabled("Property catalog");
      return this.integrations.getProperties();
    }

    try {
      const properties = await this.prisma.property.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          propertyCode: true,
          region: true
        }
      });

      return {
        properties: properties.map((property) => ({
          id: property.id,
          name: property.name,
          city: property.city ?? "",
          state: property.state ?? "",
          propertyCode: property.propertyCode,
          region: property.region ?? undefined
        }))
      };
    } catch (error) {
      this.logger.warn(`Falling back to mock property catalog: ${(error as Error).message}`);
      if (!this.devMocksEnabled) {
        throw error instanceof Error ? error : new Error(String(error));
      }
      return this.integrations.getProperties();
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
