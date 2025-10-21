import { Controller, Get, Param } from "@nestjs/common";

import { ReferenceLookupService } from "./reference-lookup.service";
import type {
  ReferenceLookupColumnChoice,
  ReferenceLookupRegistryResponse,
  ReferenceLookupTableChoice
} from "./reference-lookup.service";

@Controller("api")
export class ReferenceLookupController {
  constructor(private readonly referenceLookupService: ReferenceLookupService) {}

  @Get("schema/registry")
  getSchemaRegistry(): Promise<ReferenceLookupRegistryResponse> {
    const orgId = this.getOrgId();
    return this.referenceLookupService.getSchemaRegistry(orgId);
  }

  @Get("tables/choices")
  getTableChoices(): Promise<ReferenceLookupTableChoice[]> {
    const orgId = this.getOrgId();
    return this.referenceLookupService.getTableChoices(orgId);
  }

  @Get("tables/:tableId/columns/choices")
  getColumnChoices(@Param("tableId") tableId: string): Promise<ReferenceLookupColumnChoice[]> {
    const orgId = this.getOrgId();
    return this.referenceLookupService.getColumnChoices(orgId, tableId);
  }

  private getOrgId() {
    // TODO: Replace with authenticated organization lookup once auth wiring is available.
    return "demo-org";
  }
}
