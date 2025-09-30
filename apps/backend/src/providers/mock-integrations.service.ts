import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  sampleCost,
  sampleOccupancy,
  samplePipeline,
  sampleReviews,
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

  getOccupancyMetrics() {
    this.ensureMockMode();
    return sampleOccupancy;
  }

  getPipelineMetrics() {
    this.ensureMockMode();
    return samplePipeline;
  }

  getCostMetrics() {
    this.ensureMockMode();
    return sampleCost;
  }

  getLatestReviews() {
    this.ensureMockMode();
    return sampleReviews;
  }

  getWeeklyReport() {
    this.ensureMockMode();
    return sampleWeeklyReport;
  }
}
