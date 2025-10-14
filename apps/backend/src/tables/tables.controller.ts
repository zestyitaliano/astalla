import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  CreateColumnDto,
  CreateRowDto,
  CreateTableDto,
  CreateViewDto,
  PatchCellsDto,
  ReorderRowsDto,
  type TableQueryFilter,
  type TableQueryRequest,
  type TableQuerySort,
  UpdateColumnDto,
  UpdateViewDto
} from "@shared/api";
import type { Response } from "express";
import type { Buffer } from "node:buffer";

type UploadedCsvFile = {
  buffer: Buffer;
};

import { TablesService } from "./tables.service";

@Controller("admin/tables")
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  list() {
    const orgId = this.getOrgId();
    return this.tablesService.listTables(orgId);
  }

  @Post()
  create(@Body() dto: CreateTableDto) {
    const orgId = this.getOrgId();
    const actorId = this.getActorId();
    return this.tablesService.createTable(orgId, actorId, dto);
  }

  @Get(":id")
  getTable(@Param("id") id: string) {
    const orgId = this.getOrgId();
    return this.tablesService.getTable(orgId, id);
  }

  @Get(":id/query")
  queryTable(@Param("id") id: string, @Query() query: Record<string, string | string[]>) {
    const orgId = this.getOrgId();
    const options = this.parseQueryParams(query);
    return this.tablesService.query(orgId, id, options);
  }

  @Post(":id/columns")
  addColumn(@Param("id") id: string, @Body() dto: CreateColumnDto) {
    const orgId = this.getOrgId();
    const actorId = this.getActorId();
    return this.tablesService.createColumn(orgId, { ...dto, tableId: id }, actorId);
  }

  @Patch("columns/:id")
  updateColumn(@Param("id") id: string, @Body() dto: UpdateColumnDto) {
    const orgId = this.getOrgId();
    const actorId = this.getActorId();
    return this.tablesService.updateColumn(orgId, id, dto, actorId);
  }

  @Delete("columns/:id")
  deleteColumn(@Param("id") id: string) {
    const orgId = this.getOrgId();
    const actorId = this.getActorId();
    return this.tablesService.deleteColumn(orgId, id, actorId);
  }

  @Post(":id/rows")
  createRow(@Param("id") id: string, @Body() dto: CreateRowDto) {
    const orgId = this.getOrgId();
    const actorId = this.getActorId();
    return this.tablesService.createRow(orgId, { ...dto, tableId: id }, actorId);
  }

  @Patch("rows/:id")
  patchCells(@Param("id") id: string, @Body() dto: PatchCellsDto) {
    const orgId = this.getOrgId();
    const actorId = this.getActorId();
    return this.tablesService.patchCells(orgId, { ...dto, rowId: id }, actorId);
  }

  @Patch(":id/rows/reorder")
  reorderRows(@Param("id") id: string, @Body() dto: ReorderRowsDto) {
    const orgId = this.getOrgId();
    const actorId = this.getActorId();
    return this.tablesService.reorderRows(orgId, id, dto, actorId);
  }

  @Delete("rows/:id")
  deleteRow(@Param("id") id: string) {
    const orgId = this.getOrgId();
    const actorId = this.getActorId();
    return this.tablesService.deleteRow(orgId, id, actorId);
  }

  @Post(":id/views")
  createView(@Param("id") id: string, @Body() dto: CreateViewDto) {
    const orgId = this.getOrgId();
    const actorId = this.getActorId();
    return this.tablesService.createView(orgId, { ...dto, tableId: id }, actorId);
  }

  @Patch("views/:id")
  updateView(@Param("id") id: string, @Body() dto: UpdateViewDto) {
    const orgId = this.getOrgId();
    const actorId = this.getActorId();
    return this.tablesService.updateView(orgId, id, dto, actorId);
  }

  @Delete("views/:id")
  deleteView(@Param("id") id: string) {
    const orgId = this.getOrgId();
    const actorId = this.getActorId();
    return this.tablesService.deleteView(orgId, id, actorId);
  }

  @Get(":id/export.csv")
  async exportCsv(@Param("id") id: string, @Res() res: Response, @Query("viewId") viewId?: string) {
    const orgId = this.getOrgId();
    const data = await this.tablesService.exportCsv(orgId, id, viewId);
    const csv = this.buildCsv(data.headers, data.rows);
    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", `attachment; filename="${id}.csv"`);
    res.send(csv);
  }

  @Post(":id/import.csv")
  @UseInterceptors(FileInterceptor("file"))
  async importCsv(@Param("id") id: string, @UploadedFile() file: UploadedCsvFile) {
    if (!file) {
      throw new BadRequestException("file is required");
    }

    const orgId = this.getOrgId();
    const actorId = this.getActorId();
    return this.tablesService.importCsv(orgId, id, file.buffer, actorId);
  }

  private buildCsv(headers: string[], rows: string[][]) {
    const escape = (value: string) => {
      const sanitized = value ?? "";
      let processed = sanitized;

      if (processed.includes("\"")) {
        processed = processed.replace(/"/g, '""');
      }

      if (/[,"\n\r]/.test(processed)) {
        return `"${processed}"`;
      }

      return processed;
    };

    return [headers, ...rows]
      .map((row) => row.map((cell) => escape(cell ?? "")).join(","))
      .join("\n");
  }

  private getOrgId() {
    return "demo-org";
  }

  private getActorId() {
    return "demo-user";
  }

  private parseQueryParams(params: Record<string, string | string[]>): TableQueryRequest {
    const options: TableQueryRequest = {};

    const limit = this.parseIntegerParam(params.limit, "limit");
    if (limit !== undefined) {
      options.limit = limit;
    }

    const offset = this.parseIntegerParam(params.offset, "offset");
    if (offset !== undefined) {
      options.offset = offset;
    }

    const viewId = this.parseStringParam(params.viewId);
    if (viewId) {
      options.viewId = viewId;
    }

    const filters = this.parseJsonArray<TableQueryFilter>(params.filters, "filters");
    if (filters) {
      options.filters = filters;
    }

    const sorts = this.parseJsonArray<TableQuerySort>(params.sorts, "sorts");
    if (sorts) {
      options.sorts = sorts;
    }

    return options;
  }

  private parseIntegerParam(value: string | string[] | undefined, field: string): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    const raw = Array.isArray(value) ? value[0] : value;
    const trimmed = raw?.trim();

    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);

    if (!Number.isInteger(parsed)) {
      throw new BadRequestException(`${field} must be an integer`);
    }

    return parsed;
  }

  private parseStringParam(value: string | string[] | undefined): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    const raw = Array.isArray(value) ? value[0] : value;
    const trimmed = raw?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  }

  private parseJsonArray<T>(value: string | string[] | undefined, field: string): T[] | undefined {
    if (value === undefined) {
      return undefined;
    }

    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;

      if (parsed === undefined || parsed === null) {
        return undefined;
      }

      if (!Array.isArray(parsed)) {
        throw new BadRequestException(`${field} must be an array`);
      }

      return parsed as T[];
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON";
      throw new BadRequestException(`${field} is invalid: ${message}`);
    }
  }
}
