import { Injectable } from "@nestjs/common";

import { MockIntegrationsService } from "../providers/mock-integrations.service";

@Injectable()
export class AlertsService {
  constructor(private readonly integrations: MockIntegrationsService) {}

  getAlerts(propertyId?: string) {
    return this.integrations.getAlerts(propertyId);
  }
}
