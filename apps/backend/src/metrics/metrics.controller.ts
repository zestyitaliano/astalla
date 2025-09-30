import { Controller, Get } from "@nestjs/common";

import { MetricsService } from "./metrics.service";

@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get("occupancy")
  getOccupancy() {
    return this.metricsService.getOccupancy();
  }

  @Get("pipeline")
  getPipeline() {
    return this.metricsService.getPipeline();
  }

  @Get("cost")
  getCost() {
    return this.metricsService.getCost();
  }
}
