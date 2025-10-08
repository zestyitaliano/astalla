import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { WeeklyReportResponse } from "@shared/api";

import {
  getAlerts,
  getCost,
  getOccupancy,
  getPipeline,
  getProperties,
  getReviews,
  sampleUser,
  sampleWeeklyReport
} from "./sample-data";

@Injectable()
export class MockIntegrationsService {
  private readonly logger = new Logger(MockIntegrationsService.name);
  private readonly devMocksEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.devMocksEnabled = this.configService.get<boolean>("devMocks") ?? false;
  }

  private ensureMockMode() {
    if (!this.devMocksEnabled) {
      this.logger.error(
        "Mock integrations attempted while DEV_MOCKS is disabled. Configure real providers for production use."
      );
      throw new ServiceUnavailableException(
        "Developer mock integrations are disabled. Set DEV_MOCKS=true to enable mock data paths."
      );
    }
  }

  getCurrentUser() {
    this.ensureMockMode();
    return sampleUser;
  }

  getProperties() {
    this.ensureMockMode();
    return getProperties();
  }

  getOccupancyMetrics(propertyId?: string, windowParam?: string) {
    this.ensureMockMode();
    return getOccupancy(propertyId, windowParam);
  }

  getPipelineMetrics(propertyId?: string, windowParam?: string) {
    this.ensureMockMode();
    return getPipeline(propertyId, windowParam);
  }

  getCostMetrics(propertyId?: string, windowParam?: string) {
    this.ensureMockMode();
    return getCost(propertyId, windowParam);
  }

  getLatestReviews(propertyId?: string) {
    this.ensureMockMode();
    return getReviews(propertyId);
  }

  getWeeklyReport(): WeeklyReportResponse {
    this.ensureMockMode();
    return sampleWeeklyReport;
  }

  getAlerts(propertyId?: string) {
    this.ensureMockMode();
    return getAlerts(propertyId);
  }
}
