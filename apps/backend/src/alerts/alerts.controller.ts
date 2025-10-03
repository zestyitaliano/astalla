import { Controller, Get, Headers, Query } from "@nestjs/common";

import { AlertsService } from "./alerts.service";

@Controller("alerts")
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  getAlerts(@Query("propertyId") propertyId?: string, @Headers("x-mock-mode") mockHeader?: string) {
    return this.alertsService.getAlerts(propertyId, this.shouldUseMock(mockHeader));
  }

  private shouldUseMock(header?: string) {
    return header?.toLowerCase() === "true";
  }
}
