import { Controller, Get, Query } from "@nestjs/common";

import { AlertsService } from "./alerts.service";

@Controller("alerts")
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  getAlerts(@Query("propertyId") propertyId?: string) {
    return this.alertsService.getAlerts(propertyId);
  }
}
