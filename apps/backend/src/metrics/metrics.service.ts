import { Injectable } from "@nestjs/common";

import { MockIntegrationsService } from "../providers/mock-integrations.service";

@Injectable()
export class MetricsService {
  constructor(private readonly integrations: MockIntegrationsService) {}

  getOccupancy() {
    return this.integrations.getOccupancyMetrics();
  }

  getPipeline() {
    return this.integrations.getPipelineMetrics();
  }

  getCost() {
    return this.integrations.getCostMetrics();
  }
}
