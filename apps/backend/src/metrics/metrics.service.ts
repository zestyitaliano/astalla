import { Injectable } from "@nestjs/common";

import { MockIntegrationsService } from "../providers/mock-integrations.service";

@Injectable()
export class MetricsService {
  constructor(private readonly integrations: MockIntegrationsService) {}

  getOccupancy(propertyId?: string, windowParam?: string) {
    return this.integrations.getOccupancyMetrics(propertyId, windowParam);
  }

  getPipeline(propertyId?: string, windowParam?: string) {
    return this.integrations.getPipelineMetrics(propertyId, windowParam);
  }

  getCost(propertyId?: string, windowParam?: string) {
    return this.integrations.getCostMetrics(propertyId, windowParam);
  }
}
