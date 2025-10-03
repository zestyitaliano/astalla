import { Controller, Get, Headers, Query } from "@nestjs/common";

import { MetricsService } from "./metrics.service";

@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get("occupancy")
  getOccupancy(
    @Query("propertyId") propertyId?: string,
    @Query("window") windowParam?: string,
    @Headers("x-mock-mode") mockHeader?: string
  ) {
    return this.metricsService.getOccupancy(propertyId, windowParam, this.shouldUseMock(mockHeader));
  }

  @Get("pipeline")
  getPipeline(
    @Query("propertyId") propertyId?: string,
    @Query("window") windowParam?: string,
    @Headers("x-mock-mode") mockHeader?: string
  ) {
    return this.metricsService.getPipeline(propertyId, windowParam, this.shouldUseMock(mockHeader));
  }

  @Get("cost")
  getCost(
    @Query("propertyId") propertyId?: string,
    @Query("window") windowParam?: string,
    @Headers("x-mock-mode") mockHeader?: string
  ) {
    return this.metricsService.getCost(propertyId, windowParam, this.shouldUseMock(mockHeader));
  }

  private shouldUseMock(header?: string) {
    return header?.toLowerCase() === "true";
  }
}
