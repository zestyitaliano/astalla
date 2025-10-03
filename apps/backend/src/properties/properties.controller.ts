import { Controller, Get, Headers } from "@nestjs/common";

import { PropertiesService } from "./properties.service";

@Controller("properties")
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  list(@Headers("x-mock-mode") mockHeader?: string) {
    return this.propertiesService.list(this.shouldUseMock(mockHeader));
  }

  private shouldUseMock(header?: string) {
    return header?.toLowerCase() === "true";
  }
}
