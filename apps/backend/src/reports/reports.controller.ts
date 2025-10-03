import { Controller, Get, Headers } from "@nestjs/common";

import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("weekly")
  getWeekly(@Headers("x-mock-mode") mockHeader?: string) {
    return this.reportsService.getWeeklyReport(this.shouldUseMock(mockHeader));
  }

  private shouldUseMock(header?: string) {
    return header?.toLowerCase() === "true";
  }
}
