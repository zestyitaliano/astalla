import { Controller, Get, Param } from "@nestjs/common";

import { ReferenceLookupService } from "./reference-lookup.service";

@Controller("api")
export class ReferenceLookupController {
  constructor(private readonly referenceLookupService: ReferenceLookupService) {}

  @Get("schema/registry")
  getSchemaRegistry() {
    const orgId = this.getOrgId();
    return this.referenceLookupService.getSchemaRegistry(orgId);
  }

  @Get("tables/choices")
  getTableChoices() {
    const orgId = this.getOrgId();
    return this.referenceLookupService.getTableChoices(orgId);
  }

  @Get("tables/:tableId/columns/choices")
  getColumnChoices(@Param("tableId") tableId: string) {
    const orgId = this.getOrgId();
    return this.referenceLookupService.getColumnChoices(orgId, tableId);
  }

  private getOrgId() {
    // TODO: Replace with authenticated organization lookup once auth wiring is available.
    return "demo-org";
  }
}
