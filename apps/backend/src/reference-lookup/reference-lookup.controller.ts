import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Patch
} from "@nestjs/common";

import { ReferenceLookupService } from "./reference-lookup.service";
import type {
  ReferenceLookupColumnChoice,
  ReferenceLookupRegistryResponse,
  ReferenceLookupTableChoice
} from "./reference-lookup.service";

@Controller("api")
export class ReferenceLookupController {
  private readonly logger = new Logger(ReferenceLookupController.name);

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

  @Get("tables/:tableId")
  async getTable(@Param("tableId") tableId: string) {
    try {
      return await this.referenceLookupService.getTableDetail(tableId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(`Table ${tableId} not found`);
        throw error;
      }

      const trace = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error(`getTableDetail failed for table ${tableId}`, trace);
      throw new HttpException("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
    }
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
