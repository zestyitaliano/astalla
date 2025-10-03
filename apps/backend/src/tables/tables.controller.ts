import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query
} from "@nestjs/common";
import { Prisma, TableColumnType, TableRole } from "@prisma/client";

import { TablesService } from "./tables.service";

@Controller("tables")
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  list(@Query("orgId") orgId?: string) {
    if (!orgId) {
      throw new BadRequestException("orgId query parameter is required");
    }

    return this.tablesService.list(orgId);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.tablesService.get(id);
  }

  @Post()
  create(
    @Body()
    body: {
      orgId: string;
      name: string;
      columns?: Array<{
        name: string;
        type: TableColumnType;
        refTableId?: string | null;
        formulaExpr?: string | null;
      }>;
      userId?: string | null;
    }
  ) {
    return this.tablesService.createTable(body);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      userId?: string | null;
    }
  ) {
    return this.tablesService.updateTable(id, body);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.tablesService.deleteTable(id);
  }

  @Post(":id/columns")
  createColumn(
    @Param("id") id: string,
    @Body()
    body: {
      name: string;
      type: TableColumnType;
      refTableId?: string | null;
      formulaExpr?: string | null;
      order?: number;
      userId?: string | null;
    }
  ) {
    return this.tablesService.createColumn(id, body);
  }

  @Patch("columns/:columnId")
  updateColumn(
    @Param("columnId") columnId: string,
    @Body()
    body: {
      name?: string;
      type?: TableColumnType;
      refTableId?: string | null;
      formulaExpr?: string | null;
      order?: number;
      userId?: string | null;
    }
  ) {
    return this.tablesService.updateColumn(columnId, body);
  }

  @Delete("columns/:columnId")
  deleteColumn(@Param("columnId") columnId: string, @Query("userId") userId?: string) {
    return this.tablesService.deleteColumn(columnId, userId);
  }

  @Post(":id/columns/reorder")
  reorderColumns(
    @Param("id") id: string,
    @Body()
    body: {
      columnIds: string[];
      userId?: string | null;
    }
  ) {
    return this.tablesService.reorderColumns(id, body);
  }

  @Post(":id/rows")
  createRow(
    @Param("id") id: string,
    @Body()
    body: {
      values: Record<string, unknown>;
      userId?: string | null;
      order?: number;
    }
  ) {
    return this.tablesService.createRow(id, body);
  }

  @Patch("rows/:rowId")
  updateRow(
    @Param("rowId") rowId: string,
    @Body()
    body: {
      values: Record<string, unknown>;
      userId?: string | null;
    }
  ) {
    return this.tablesService.updateRow(rowId, body);
  }

  @Delete("rows/:rowId")
  deleteRow(@Param("rowId") rowId: string, @Query("userId") userId?: string) {
    return this.tablesService.deleteRow(rowId, userId);
  }

  @Post(":id/rows/reorder")
  reorderRows(
    @Param("id") id: string,
    @Body()
    body: {
      rowIds: string[];
      userId?: string | null;
    }
  ) {
    return this.tablesService.reorderRows(id, body);
  }

  @Get(":id/views")
  listViews(@Param("id") id: string) {
    return this.tablesService.listViews(id);
  }

  @Post(":id/views")
  createView(
    @Param("id") id: string,
    @Body()
    body: {
      userId: string;
      name: string;
      configJson: unknown;
    }
  ) {
    return this.tablesService.createView(id, {
      userId: body.userId,
      name: body.name,
      configJson: body.configJson as Prisma.JsonValue
    });
  }

  @Patch("views/:viewId")
  updateView(
    @Param("viewId") viewId: string,
    @Body()
    body: {
      name?: string;
      configJson?: unknown;
    }
  ) {
    return this.tablesService.updateView(viewId, {
      name: body.name,
      configJson: body.configJson as Prisma.JsonValue | undefined
    });
  }

  @Delete("views/:viewId")
  deleteView(@Param("viewId") viewId: string) {
    return this.tablesService.deleteView(viewId);
  }

  @Get(":id/permissions")
  listPermissions(@Param("id") id: string) {
    return this.tablesService.listPermissions(id);
  }

  @Put(":id/permissions")
  setPermissions(
    @Param("id") id: string,
    @Body()
    body: {
      permissions: Array<{
        role: TableRole;
        rowId?: string | null;
        columnId?: string | null;
        canRead: boolean;
        canWrite: boolean;
      }>;
    }
  ) {
    return this.tablesService.setPermissions(id, body.permissions ?? []);
  }

  @Get(":id/history")
  getHistory(
    @Param("id") id: string,
    @Query("rowId") rowId?: string,
    @Query("columnId") columnId?: string,
    @Query("limit") limit?: string
  ) {
    return this.tablesService.getHistory(id, {
      rowId,
      columnId,
      limit: limit ? Number(limit) : undefined
    });
  }

  @Get(":id/forms")
  listForms(@Param("id") id: string) {
    return this.tablesService.listForms(id);
  }

  @Post(":id/forms")
  createForm(
    @Param("id") id: string,
    @Body()
    body: {
      name: string;
      configJson: unknown;
      isPublic?: boolean;
    }
  ) {
    return this.tablesService.createForm(id, {
      name: body.name,
      configJson: body.configJson as Prisma.JsonValue,
      isPublic: body.isPublic
    });
  }
}
