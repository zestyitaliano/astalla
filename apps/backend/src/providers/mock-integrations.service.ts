import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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

  constructor(private readonly configService: ConfigService) {}

  private ensureMockMode() {
    if (!this.configService.get<boolean>("mockMode")) {
      this.logger.warn("Mock integrations used while MOCK_MODE is disabled. Configure real providers for production use.");
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

  getWeeklyReport() {
    this.ensureMockMode();
    return sampleWeeklyReport;
  }

  getAlerts(propertyId?: string) {
    this.ensureMockMode();
    return getAlerts(propertyId);
  }
}
