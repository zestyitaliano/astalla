import { Controller, Get, Query } from "@nestjs/common";

import { MetricsService } from "./metrics.service";

@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get("occupancy")
  getOccupancy(
    @Query("propertyId") propertyId?: string,
    @Query("window") windowParam?: string
  ) {
    return this.metricsService.getOccupancy(propertyId, windowParam);
  }

  @Get("pipeline")
  getPipeline(
    @Query("propertyId") propertyId?: string,
    @Query("window") windowParam?: string
  ) {
    return this.metricsService.getPipeline(propertyId, windowParam);
  }

  @Get("cost")
  getCost(
    @Query("propertyId") propertyId?: string,
    @Query("window") windowParam?: string
  ) {
    return this.metricsService.getCost(propertyId, windowParam);
  }
}
