import { Injectable } from "@nestjs/common";

import { MockIntegrationsService } from "../providers/mock-integrations.service";

@Injectable()
export class ReportsService {
  constructor(private readonly integrations: MockIntegrationsService) {}

  getWeeklyReport() {
    return this.integrations.getWeeklyReport();
  }
}
