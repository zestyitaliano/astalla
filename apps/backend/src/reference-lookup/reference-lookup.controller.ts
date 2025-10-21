import { Body, Controller, Get, Param, Patch } from "@nestjs/common";

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

  @Patch("tables/:tableId/columns/:columnId")
  updateColumn(
    @Param("tableId") tableId: string,
    @Param("columnId") columnId: string,
    @Body()
    body: {
      type?: string;
      referenceConfig?: {
        targetTableId: string;
        displayColumnId?: string | null;
        cardinality?: "single" | "multi";
        enforceForeignKey?: boolean;
      };
    }
  ) {
    return this.referenceLookupService.updateColumn(tableId, columnId, body);
  }

  private getOrgId() {
    // TODO: Replace with authenticated organization lookup once auth wiring is available.
    return "demo-org";
  }
}
