import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ColumnType as PrismaColumnType, Prisma, TableCell, TableColumn, TableRow } from "@prisma/client";
import {
  ColumnType as SharedColumnType,
  CreateColumnDto,
  CreateRowDto,
  CreateTableDto,
  CreateViewDto,
  PatchCellsDto,
  ReorderRowsDto,
  type TableQueryFilter,
  type TableQueryRequest,
  type TableQueryResponse,
  type TableQuerySort,
  UpdateColumnDto,
  UpdateTableDto,
  UpdateViewDto
} from "@shared/api";

import { PrismaService } from "../prisma/prisma.service";

const SAMPLE_ROW_LIMIT = 50;
const DEFAULT_QUERY_LIMIT = 50;
const MAX_QUERY_LIMIT = 500;

const FILTER_OPERATORS: TableQueryFilter["operator"][] = [
  "eq",
  "neq",
  "contains",
  "lt",
  "lte",
  "gt",
  "gte",
  "in",
  "notIn",
  "isEmpty",
  "isNotEmpty"
];

interface ViewConfig {
  filters?: TableQueryFilter[];
  sorts?: TableQuerySort[];
  columnOrder?: string[];
  hidden?: string[];
}

type RowWithCells = TableRow & { cells: TableCell[] };

type NormalizedRow = {
  row: RowWithCells;
  cellMap: Map<string, TableCell>;
  values: Map<string, unknown>;
};

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async createTable(orgId: string, actorId: string | null, dto: CreateTableDto) {
    try {
      const table = await this.prisma.dataTable.create({
        data: {
          orgId,
          name: dto.name,
          description: dto.description ?? null,
          createdBy: actorId ?? undefined
        }
      });

      await this.logAudit(this.prisma, table.id, actorId, "CREATE_TABLE", { tableId: table.id });

      return table;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException("A table with that name already exists for this organization");
      }

      throw error;
    }
  }

  async updateTable(orgId: string, id: string, actorId: string | null, dto: UpdateTableDto) {
    const data: Prisma.DataTableUpdateInput = {};
    const changes: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
      changes.name = dto.name;
    }

    if (dto.description !== undefined) {
      const description = dto.description ?? null;
      data.description = description;
      changes.description = description;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("Update payload must include at least one field");
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const table = await tx.dataTable.findFirst({
          where: { id, orgId },
          select: { id: true }
        });

        if (!table) {
          throw new NotFoundException("Table not found");
        }

        const updated = await tx.dataTable.update({
          where: { id: table.id },
          data
        });

        await this.logAudit(tx, updated.id, actorId, "UPDATE_TABLE", {
          tableId: updated.id,
          changes
        });

        return updated;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException("A table with that name already exists for this organization");
      }

      throw error;
    }
  }

  listTables(orgId: string) {
    return this.prisma.dataTable.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" }
    });
  }

  async getTable(orgId: string, id: string) {
    const table = await this.prisma.dataTable.findFirst({
      where: { id, orgId },
      include: {
        columns: {
          orderBy: { position: "asc" }
        },
        rows: {
          orderBy: { position: "asc" },
          take: SAMPLE_ROW_LIMIT,
          include: {
            cells: true
          }
        },
        views: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!table) {
      throw new NotFoundException("Table not found");
    }

    return table;
  }

  async deleteTable(orgId: string, id: string, actorId?: string | null) {
    await this.prisma.$transaction(async (tx) => {
      const table = await tx.dataTable.findFirst({
        where: { id, orgId },
        select: { id: true }
      });

      if (!table) {
        throw new NotFoundException("Table not found");
      }

      await tx.dataTable.delete({ where: { id: table.id } });

      await this.logAudit(tx, table.id, actorId, "DELETE_TABLE", { tableId: table.id });
    });
  }

  async createColumn(orgId: string, dto: CreateColumnDto, actorId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const table = await tx.dataTable.findFirst({
        where: { id: dto.tableId, orgId },
        include: {
          columns: {
            orderBy: { position: "asc" }
          }
        }
      });

      if (!table) {
        throw new NotFoundException("Table not found");
      }

      const slugSet = new Set(table.columns.map((column) => column.slug));
      const slug = this.ensureUniqueSlug(slugSet, dto.name);
      const nextPosition = table.columns.length
        ? Math.max(...table.columns.map((column) => column.position)) + 1
        : 1;

      const column = await tx.tableColumn.create({
        data: {
          tableId: table.id,
          name: dto.name,
          slug,
          type: dto.type as PrismaColumnType,
          position: nextPosition,
          ...(dto.config !== undefined ? { config: this.serializeJson(dto.config) } : {})
        }
      });

      await this.logAudit(tx, table.id, actorId, "ADD_COLUMN", { columnId: column.id });

      return column;
    });
  }

  async updateColumn(orgId: string, id: string, dto: UpdateColumnDto, actorId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const column = await tx.tableColumn.findFirst({
        where: { id, table: { orgId } }
      });

      if (!column) {
        throw new NotFoundException("Column not found");
      }

      const data: Prisma.TableColumnUpdateInput = {};

      if (dto.name) {
        data.name = dto.name;
        const otherColumns = await tx.tableColumn.findMany({
          where: {
            tableId: column.tableId,
            id: { not: column.id }
          },
          select: { slug: true }
        });
        const slugSet = new Set(otherColumns.map((item) => item.slug));
        data.slug = this.ensureUniqueSlug(slugSet, dto.name);
      }

      if (dto.config !== undefined) {
        data.config = this.serializeJson(dto.config);
      }

      if (dto.type && dto.type !== column.type) {
        data.type = dto.type as PrismaColumnType;
        if (dto.type !== PrismaColumnType.SELECT && dto.config === undefined) {
          data.config = Prisma.JsonNull;
        }
      }

      if (dto.position !== undefined && dto.position !== column.position) {
        if (dto.position < 1) {
          throw new BadRequestException("Position must be greater than 0");
        }

        if (dto.position > column.position) {
          await tx.tableColumn.updateMany({
            where: {
              tableId: column.tableId,
              position: {
                gt: column.position,
                lte: dto.position
              }
            },
            data: { position: { decrement: 1 } }
          });
        } else {
          await tx.tableColumn.updateMany({
            where: {
              tableId: column.tableId,
              position: {
                gte: dto.position,
                lt: column.position
              }
            },
            data: { position: { increment: 1 } }
          });
        }

        data.position = dto.position;
      }

      const updated = await tx.tableColumn.update({
        where: { id: column.id },
        data
      });

      await this.logAudit(tx, column.tableId, actorId, "UPDATE_COLUMN", {
        columnId: column.id,
        changes: dto
      });

      return updated;
    });
  }

  async deleteColumn(orgId: string, id: string, actorId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const column = await tx.tableColumn.findFirst({
        where: { id, table: { orgId } }
      });

      if (!column) {
        throw new NotFoundException("Column not found");
      }

      await tx.tableColumn.delete({ where: { id: column.id } });
      await tx.tableColumn.updateMany({
        where: {
          tableId: column.tableId,
          position: { gt: column.position }
        },
        data: { position: { decrement: 1 } }
      });

      await this.logAudit(tx, column.tableId, actorId, "DELETE_COLUMN", { columnId: column.id });

      return { success: true };
    });
  }

  async createRow(orgId: string, dto: CreateRowDto, actorId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const table = await tx.dataTable.findFirst({ where: { id: dto.tableId, orgId } });

      if (!table) {
        throw new NotFoundException("Table not found");
      }

      let position: number;

      if (dto.afterRowId) {
        const afterRow = await tx.tableRow.findFirst({
          where: { id: dto.afterRowId, tableId: dto.tableId }
        });

        if (!afterRow) {
          throw new BadRequestException("afterRowId does not exist in this table");
        }

        await tx.tableRow.updateMany({
          where: {
            tableId: dto.tableId,
            position: { gt: afterRow.position }
          },
          data: { position: { increment: 1 } }
        });

        position = afterRow.position + 1;
      } else {
        const lastRow = await tx.tableRow.findFirst({
          where: { tableId: dto.tableId },
          orderBy: { position: "desc" }
        });

        position = lastRow ? lastRow.position + 1 : 1;
      }

      const row = await tx.tableRow.create({
        data: {
          tableId: dto.tableId,
          position,
          createdBy: actorId ?? undefined
        }
      });

      await this.logAudit(tx, dto.tableId, actorId, "ADD_ROW", { rowId: row.id });

      return row;
    });
  }

  async reorderRows(orgId: string, tableId: string, dto: ReorderRowsDto, actorId?: string | null) {
    if (!dto.order.length) {
      return { success: true };
    }

    return this.prisma.$transaction(async (tx) => {
      const table = await tx.dataTable.findFirst({ where: { id: tableId, orgId } });

      if (!table) {
        throw new NotFoundException("Table not found");
      }

      const rowIds = dto.order.map((item) => item.rowId);
      const rows = await tx.tableRow.findMany({
        where: { id: { in: rowIds }, tableId }
      });

      if (rows.length !== dto.order.length) {
        throw new BadRequestException("One or more rows do not belong to this table");
      }

      await Promise.all(
        dto.order.map((item) =>
          tx.tableRow.update({
            where: { id: item.rowId },
            data: { position: item.position }
          })
        )
      );

      await this.logAudit(tx, tableId, actorId, "REORDER_ROWS", { order: dto.order });

      return { success: true };
    });
  }

  async patchCells(orgId: string, dto: PatchCellsDto, actorId?: string | null) {
    if (!dto.cells.length) {
      return { success: true };
    }

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.tableRow.findFirst({
        where: { id: dto.rowId, table: { orgId } },
        include: {
          table: {
            include: {
              columns: true
            }
          }
        }
      });

      if (!row) {
        throw new NotFoundException("Row not found");
      }

      const columnMap = new Map(row.table.columns.map((column) => [column.id, column] as const));

      for (const cell of dto.cells) {
        const column = columnMap.get(cell.columnId);

        if (!column) {
          throw new BadRequestException(`Column ${cell.columnId} does not belong to this table`);
        }

        if (cell.value === undefined) {
          continue;
        }

        const normalizedValue = this.normalizeCellInput(column, cell.value);

        await tx.tableCell.upsert({
          where: {
            rowId_columnId: {
              rowId: row.id,
              columnId: column.id
            }
          },
          create: {
            rowId: row.id,
            columnId: column.id,
            value: normalizedValue
          },
          update: {
            value: normalizedValue
          }
        });
      }

      await tx.tableRow.update({
        where: { id: row.id },
        data: { updatedBy: actorId ?? undefined }
      });

      await this.logAudit(tx, row.tableId, actorId, "UPDATE_CELLS", {
        rowId: row.id,
        cells: dto.cells.map((item) => ({ columnId: item.columnId }))
      });

      return { success: true };
    });
  }

  async deleteRow(orgId: string, rowId: string, actorId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.tableRow.findFirst({
        where: { id: rowId, table: { orgId } }
      });

      if (!row) {
        throw new NotFoundException("Row not found");
      }

      await tx.tableRow.delete({ where: { id: row.id } });
      await tx.tableRow.updateMany({
        where: {
          tableId: row.tableId,
          position: { gt: row.position }
        },
        data: { position: { decrement: 1 } }
      });

      await this.logAudit(tx, row.tableId, actorId, "DELETE_ROW", { rowId: row.id });

      return { success: true };
    });
  }

  async createView(orgId: string, dto: CreateViewDto, actorId?: string | null) {
    const table = await this.prisma.dataTable.findFirst({ where: { id: dto.tableId, orgId } });

    if (!table) {
      throw new NotFoundException("Table not found");
    }

    const sanitizedConfig = this.sanitizeViewConfig(dto.config);

    const view = await this.prisma.tableView.create({
      data: {
        tableId: dto.tableId,
        name: dto.name,
        config: this.serializeJson(sanitizedConfig),
        createdBy: actorId ?? undefined
      }
    });

    await this.logAudit(this.prisma, dto.tableId, actorId, "CREATE_VIEW", { viewId: view.id });

    return view;
  }

  async updateView(orgId: string, id: string, dto: UpdateViewDto, actorId?: string | null) {
    const view = await this.prisma.tableView.findFirst({
      where: { id, table: { orgId } }
    });

    if (!view) {
      throw new NotFoundException("View not found");
    }

    const data: Prisma.TableViewUpdateInput = {
      name: dto.name ?? view.name
    };

    if (dto.config !== undefined) {
      const sanitizedConfig = this.sanitizeViewConfig(dto.config);
      data.config = this.serializeJson(sanitizedConfig);
    }

    const updated = await this.prisma.tableView.update({
      where: { id },
      data
    });

    await this.logAudit(this.prisma, view.tableId, actorId, "UPDATE_VIEW", {
      viewId: view.id,
      changes: dto
    });

    return updated;
  }

  async deleteView(orgId: string, id: string, actorId?: string | null) {
    const view = await this.prisma.tableView.findFirst({
      where: { id, table: { orgId } }
    });

    if (!view) {
      throw new NotFoundException("View not found");
    }

    await this.prisma.tableView.delete({ where: { id } });
    await this.logAudit(this.prisma, view.tableId, actorId, "DELETE_VIEW", { viewId: view.id });

    return { success: true };
  }

  async query(
    orgId: string,
    tableId: string,
    options: TableQueryRequest = {}
  ): Promise<TableQueryResponse> {
    const limit = Math.min(Math.max(options.limit ?? DEFAULT_QUERY_LIMIT, 1), MAX_QUERY_LIMIT);
    const offset = Math.max(options.offset ?? 0, 0);

    const context = await this.buildQueryContext(orgId, tableId, options);

    const pagedRows: TableQueryResponse["rows"] = context.rows
      .slice(offset, offset + limit)
      .map((entry) => this.projectRow(entry, context.visibleColumns));

    const resultColumns: TableQueryResponse["columns"] = context.visibleColumns.map(
      (column) => ({
        id: column.id,
        tableId: column.tableId,
        name: column.name,
        slug: column.slug,
        type: column.type as unknown as SharedColumnType,
        position: column.position,
        config: this.deserializeJson(column.config) ?? undefined,
        createdAt: column.createdAt.toISOString(),
        updatedAt: column.updatedAt.toISOString()
      })
    );

    return {
      rows: pagedRows,
      columns: resultColumns,
      total: context.total
    };
  }

  async exportCsv(
    orgId: string,
    tableId: string,
    viewId?: string
  ): Promise<{ headers: string[]; rows: AsyncIterable<string[]> }> {
    const context = await this.buildQueryContext(orgId, tableId, { viewId });
    const headers = context.visibleColumns.map((column) => column.name);

    const iterator = (async function* (service: TablesService) {
      for (const entry of context.rows) {
        const row = context.visibleColumns.map((column) =>
          service.formatValueForExport(column.type as PrismaColumnType, entry.values.get(column.id))
        );
        yield row;
      }
    })(this);

    return { headers, rows: iterator };
  }

  async importCsv(orgId: string, tableId: string, fileBuffer: Buffer, actorId?: string | null) {
    const parsed = this.parseCsv(fileBuffer);

    if (!parsed.length) {
      return { createdColumns: 0, createdRows: 0 };
    }

    const headers = (parsed.shift() ?? []).map((header) =>
      typeof header === "string" ? header.trim() : String(header ?? "").trim()
    );

    if (!headers.length) {
      return { createdColumns: 0, createdRows: 0 };
    }

    const rows = parsed.filter((row) =>
      row.some((value) => (typeof value === "string" ? value.trim() : String(value ?? "").trim()).length)
    );

    if (!rows.length) {
      return { createdColumns: 0, createdRows: 0 };
    }

    return this.prisma.$transaction(async (tx) => {
      const table = await tx.dataTable.findFirst({
        where: { id: tableId, orgId },
        include: {
          columns: {
            orderBy: { position: "asc" }
          }
        }
      });

      if (!table) {
        throw new NotFoundException("Table not found");
      }

      const nameMap = new Map(table.columns.map((column) => [column.name.toLowerCase(), column] as const));
      const slugSet = new Set(table.columns.map((column) => column.slug));
      let nextColumnPosition = table.columns.length
        ? Math.max(...table.columns.map((column) => column.position)) + 1
        : 1;
      const columnRefs: (TableColumn | null)[] = [];
      let createdColumns = 0;

      for (const header of headers) {
        const normalizedName = header.trim();

        if (!normalizedName) {
          columnRefs.push(null);
          continue;
        }

        let column = nameMap.get(normalizedName.toLowerCase()) ?? null;

        if (!column) {
          const slug = this.ensureUniqueSlug(slugSet, normalizedName);
          column = await tx.tableColumn.create({
            data: {
              tableId,
              name: normalizedName,
              slug,
              type: PrismaColumnType.TEXT,
              position: nextColumnPosition++,
              config: Prisma.JsonNull
            }
          });
          nameMap.set(normalizedName.toLowerCase(), column);
          slugSet.add(column.slug);
          createdColumns += 1;
        }

        columnRefs.push(column);
      }

      const lastRow = await tx.tableRow.findFirst({
        where: { tableId },
        orderBy: { position: "desc" }
      });
      let nextRowPosition = lastRow ? lastRow.position + 1 : 1;
      let createdRows = 0;

      for (const rowValues of rows) {
        const hasContent = rowValues.some((value, index) => {
          const column = columnRefs[index];
          if (!column) {
            return false;
          }
          const textValue = typeof value === "string" ? value.trim() : String(value ?? "").trim();
          return textValue.length > 0;
        });

        if (!hasContent) {
          continue;
        }

        const row = await tx.tableRow.create({
          data: {
            tableId,
            position: nextRowPosition++,
            createdBy: actorId ?? undefined
          }
        });

        const cellCreates = [] as Prisma.TableCellCreateManyInput[];

        rowValues.forEach((value, index) => {
          const column = columnRefs[index];
          if (!column) {
            return;
          }

          const normalizedValue = this.normalizeCellInput(column, value);

          cellCreates.push({
            rowId: row.id,
            columnId: column.id,
            value: normalizedValue
          });
        });

        if (cellCreates.length) {
          await tx.tableCell.createMany({ data: cellCreates });
        }

        createdRows += 1;
      }

      await this.logAudit(tx, tableId, actorId, "IMPORT_CSV", {
        createdColumns,
        createdRows
      });

      return { createdColumns, createdRows };
    });
  }

  private parseCsv(content: Buffer) {
    const text = content.toString("utf-8");

    if (!text) {
      return [] as string[][];
    }

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentValue = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];

      if (inQuotes) {
        if (char === "\"") {
          if (text[index + 1] === "\"") {
            currentValue += "\"";
            index += 1;
          } else {
            inQuotes = false;
          }
        } else {
          currentValue += char;
        }

        continue;
      }

      switch (char) {
        case "\"":
          inQuotes = true;
          break;
        case ",":
          currentRow.push(currentValue);
          currentValue = "";
          break;
        case "\r":
          break;
        case "\n":
          currentRow.push(currentValue);
          rows.push(currentRow);
          currentRow = [];
          currentValue = "";
          break;
        default:
          currentValue += char;
          break;
      }
    }

    if (inQuotes) {
      currentRow.push(currentValue);
    } else if (currentValue.length > 0 || currentRow.length > 0) {
      currentRow.push(currentValue);
    }

    if (currentRow.length) {
      rows.push(currentRow);
    }

    return rows;
  }

  private async logAudit(
    client: PrismaClientLike,
    tableId: string,
    actorId: string | null | undefined,
    action: string,
    payload: unknown
  ) {
    await client.tableAudit.create({
      data: {
        tableId,
        actorId: actorId ?? undefined,
        action,
        payload: this.serializeJson(payload)
      }
    });
  }

  private ensureUniqueSlug(existing: Set<string>, name: string) {
    const baseSlug = this.slugifyName(name);
    let candidate = baseSlug;
    let counter = 1;

    while (existing.has(candidate)) {
      candidate = `${baseSlug}-${counter++}`;
    }

    existing.add(candidate);
    return candidate;
  }

  private slugifyName(name: string) {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return base || "column";
  }

  private serializeJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === undefined || value === null) {
      return Prisma.JsonNull;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    try {
      return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    } catch {
      return String(value) as Prisma.InputJsonValue;
    }
  }

  private deserializeJson<T>(value: Prisma.JsonValue | null | undefined): T | null {
    if (value === null || value === undefined) {
      return null;
    }

    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      return null;
    }
  }

  private normalizeCellInput(
    column: TableColumn,
    value: unknown
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === undefined || value === null) {
      return Prisma.JsonNull;
    }

    switch (column.type) {
      case PrismaColumnType.TEXT:
        return typeof value === "string" ? value : String(value);
      case PrismaColumnType.NUMBER: {
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) {
            return Prisma.JsonNull;
          }
          value = trimmed;
        }

        const numberValue = typeof value === "number" ? value : Number(value);

        if (!Number.isFinite(numberValue)) {
          throw new BadRequestException(`Invalid number for column ${column.name}`);
        }

        return numberValue;
      }
      case PrismaColumnType.DATE: {
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) {
            return Prisma.JsonNull;
          }

          value = trimmed;
        }

        const date =
          value instanceof Date ? value : typeof value === "string" ? new Date(value) : new Date(String(value));

        if (Number.isNaN(date.getTime())) {
          throw new BadRequestException(`Invalid date for column ${column.name}`);
        }

        return date.toISOString();
      }
      case PrismaColumnType.BOOLEAN: {
        if (typeof value === "boolean") {
          return value;
        }

        if (typeof value === "number") {
          return value !== 0;
        }

        if (typeof value === "string") {
          const normalized = value.trim().toLowerCase();

          if (!normalized) {
            return Prisma.JsonNull;
          }

          if (["true", "1", "yes", "y", "on"].includes(normalized)) {
            return true;
          }

          if (["false", "0", "no", "n", "off"].includes(normalized)) {
            return false;
          }
        }

        throw new BadRequestException(`Invalid boolean for column ${column.name}`);
      }
      case PrismaColumnType.SELECT: {
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) {
            return Prisma.JsonNull;
          }

          this.ensureSelectOption(column, trimmed);
          return trimmed;
        }

        if (value && typeof value === "object" && "value" in (value as Record<string, unknown>)) {
          const optionValue = (value as Record<string, unknown>).value;
          if (typeof optionValue === "string") {
            const trimmed = optionValue.trim();
            if (!trimmed) {
              return Prisma.JsonNull;
            }

            this.ensureSelectOption(column, trimmed);
            return trimmed;
          }
        }

        const stringValue = String(value).trim();

        if (!stringValue) {
          return Prisma.JsonNull;
        }

        this.ensureSelectOption(column, stringValue);
        return stringValue;
      }
      case PrismaColumnType.REFERENCE: {
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) {
            return Prisma.JsonNull;
          }

          return this.serializeJson({ id: trimmed });
        }

        if (value && typeof value === "object") {
          const record = value as Record<string, unknown>;
          const id = record.id;

          if (typeof id !== "string" || !id.trim()) {
            throw new BadRequestException(`Reference value must include an id for column ${column.name}`);
          }

          const normalized: { id: string; label?: string } = { id: id.trim() };

          if (typeof record.label === "string" && record.label.trim()) {
            normalized.label = record.label;
          }

          return this.serializeJson(normalized);
        }

        throw new BadRequestException(`Invalid reference for column ${column.name}`);
      }
      default:
        return this.serializeJson(value);
    }
  }

  private normalizeStoredValue(column: TableColumn, value: unknown): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    switch (column.type) {
      case PrismaColumnType.TEXT:
        return typeof value === "string" ? value : String(value);
      case PrismaColumnType.NUMBER: {
        if (typeof value === "number" && Number.isFinite(value)) {
          return value;
        }
        if (typeof value === "string") {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
      }
      case PrismaColumnType.DATE: {
        if (typeof value === "string") {
          const date = new Date(value);
          return Number.isNaN(date.getTime()) ? null : date.toISOString();
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        return null;
      }
      case PrismaColumnType.BOOLEAN:
        if (typeof value === "boolean") {
          return value;
        }
        if (typeof value === "number") {
          return value !== 0;
        }
        if (typeof value === "string") {
          const normalized = value.toLowerCase();
          if (["true", "1", "yes", "y", "on"].includes(normalized)) {
            return true;
          }
          if (["false", "0", "no", "n", "off"].includes(normalized)) {
            return false;
          }
        }
        return null;
      case PrismaColumnType.SELECT:
        return typeof value === "string" ? value : String(value);
      case PrismaColumnType.REFERENCE: {
        if (value && typeof value === "object") {
          const record = value as Record<string, unknown>;
          const id = record.id;

          if (typeof id !== "string" || !id) {
            return null;
          }

          const label = typeof record.label === "string" ? record.label : undefined;
          return label ? { id, label } : { id };
        }

        if (typeof value === "string") {
          return { id: value };
        }

        return null;
      }
      default:
        return value;
    }
  }

  private ensureSelectOption(column: TableColumn, value: string) {
    const options = this.getSelectOptions(column);

    if (!options?.length) {
      return;
    }

    if (!options.includes(value)) {
      throw new BadRequestException(`Value is not allowed for column ${column.name}`);
    }
  }

  private getSelectOptions(column: TableColumn) {
    const config = this.deserializeJson<{ options?: Array<{ value?: string }> }>(column.config);

    if (!config?.options) {
      return undefined;
    }

    const values = config.options
      .map((option) => (typeof option?.value === "string" ? option.value : null))
      .filter((entry): entry is string => Boolean(entry && entry.trim().length > 0));

    return values.length ? values : undefined;
  }

  private normalizeRow(row: RowWithCells, columns: TableColumn[]): NormalizedRow {
    const cellMap = new Map(row.cells.map((cell) => [cell.columnId, cell] as const));
    const values = new Map<string, unknown>();

    for (const column of columns) {
      const cell = cellMap.get(column.id);
      values.set(column.id, this.normalizeStoredValue(column, cell?.value ?? null));
    }

    return { row, cellMap, values };
  }

  private projectRow(
    entry: NormalizedRow,
    columns: TableColumn[]
  ): TableQueryResponse["rows"][number] {
    const cells: TableQueryResponse["rows"][number]["cells"] = [];

    for (const column of columns) {
      const cell = entry.cellMap.get(column.id);

      if (!cell) {
        continue;
      }

      const normalizedValue = entry.values.get(column.id);

      cells.push({
        id: cell.id,
        rowId: cell.rowId,
        columnId: cell.columnId,
        createdAt: cell.createdAt.toISOString(),
        updatedAt: cell.updatedAt.toISOString(),
        value: normalizedValue ?? null
      });
    }

    return {
      id: entry.row.id,
      tableId: entry.row.tableId,
      position: entry.row.position,
      createdAt: entry.row.createdAt.toISOString(),
      updatedAt: entry.row.updatedAt.toISOString(),
      createdBy: entry.row.createdBy,
      updatedBy: entry.row.updatedBy,
      cells
    };
  }

  private mergeFilters(
    viewFilters?: TableQueryFilter[],
    requestFilters?: TableQueryFilter[]
  ): TableQueryFilter[] {
    const merged: TableQueryFilter[] = [];

    if (viewFilters?.length) {
      merged.push(...viewFilters);
    }

    if (requestFilters?.length) {
      merged.push(...requestFilters);
    }

    return merged;
  }

  private mergeSorts(viewSorts?: TableQuerySort[], requestSorts?: TableQuerySort[]): TableQuerySort[] {
    if (!requestSorts?.length) {
      return viewSorts?.length ? [...viewSorts] : [];
    }

    if (!viewSorts?.length) {
      return [...requestSorts];
    }

    const overridden = new Set(requestSorts.map((sort) => sort.columnId));

    return [...viewSorts.filter((sort) => !overridden.has(sort.columnId)), ...requestSorts];
  }

  private matchesFilters(
    entry: NormalizedRow,
    filters: TableQueryFilter[],
    columnMap: Map<string, TableColumn>
  ) {
    for (const filter of filters) {
      const column = columnMap.get(filter.columnId);

      if (!column) {
        continue;
      }

      const actual = entry.values.get(column.id);

      if (!this.evaluateFilter(column, actual, filter)) {
        return false;
      }
    }

    return true;
  }

  private evaluateFilter(column: TableColumn, actual: unknown, filter: TableQueryFilter): boolean {
    switch (filter.operator) {
      case "isEmpty":
        return this.isFilterEmpty(column, actual);
      case "isNotEmpty":
        return !this.isFilterEmpty(column, actual);
      case "contains": {
        if (typeof filter.value !== "string") {
          return false;
        }

        const haystack = this.getFilterString(column, actual);
        const needle = filter.value.trim().toLowerCase();

        if (!haystack || !needle) {
          return false;
        }

        return haystack.includes(needle);
      }
      case "eq": {
        const expected = this.prepareFilterValue(column, filter.value);

        if (expected === undefined) {
          return false;
        }

        if (expected === null) {
          return this.isFilterEmpty(column, actual);
        }

        return this.compareEquality(column, actual, expected);
      }
      case "neq": {
        const expected = this.prepareFilterValue(column, filter.value);

        if (expected === undefined) {
          return false;
        }

        if (expected === null) {
          return !this.isFilterEmpty(column, actual);
        }

        return !this.compareEquality(column, actual, expected);
      }
      case "lt":
      case "lte":
      case "gt":
      case "gte": {
        const expected = this.prepareFilterValue(column, filter.value);

        if (expected === undefined || expected === null) {
          return false;
        }

        switch (column.type) {
          case PrismaColumnType.NUMBER: {
            if (typeof actual !== "number" || typeof expected !== "number") {
              return false;
            }

            switch (filter.operator) {
              case "lt":
                return actual < expected;
              case "lte":
                return actual <= expected;
              case "gt":
                return actual > expected;
              case "gte":
                return actual >= expected;
              default:
                return false;
            }
          }
          case PrismaColumnType.DATE: {
            const actualTime = this.toTimestamp(actual);
            const expectedTime = this.toTimestamp(expected);

            if (actualTime === undefined || expectedTime === undefined) {
              return false;
            }

            switch (filter.operator) {
              case "lt":
                return actualTime < expectedTime;
              case "lte":
                return actualTime <= expectedTime;
              case "gt":
                return actualTime > expectedTime;
              case "gte":
                return actualTime >= expectedTime;
              default:
                return false;
            }
          }
          default:
            return false;
        }
      }
      case "in": {
        const expectedValues = this.prepareFilterArray(column, filter.value);

        if (!expectedValues?.length) {
          return false;
        }

        return expectedValues.some((item) => this.compareEquality(column, actual, item));
      }
      case "notIn": {
        const expectedValues = this.prepareFilterArray(column, filter.value);

        if (!expectedValues?.length) {
          return false;
        }

        return expectedValues.every((item) => !this.compareEquality(column, actual, item));
      }
      default:
        return true;
    }
  }

  private prepareFilterValue(column: TableColumn, value: unknown): unknown | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    switch (column.type) {
      case PrismaColumnType.TEXT:
      case PrismaColumnType.SELECT:
        return typeof value === "string" ? value : String(value);
      case PrismaColumnType.NUMBER: {
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) {
            return null;
          }
          value = trimmed;
        }

        const numberValue = typeof value === "number" ? value : Number(value);
        return Number.isFinite(numberValue) ? numberValue : undefined;
      }
      case PrismaColumnType.DATE: {
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) {
            return null;
          }

          const date = new Date(trimmed);
          return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
        }

        if (value instanceof Date) {
          return value.toISOString();
        }

        const date = new Date(String(value));
        return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
      }
      case PrismaColumnType.BOOLEAN: {
        if (typeof value === "boolean") {
          return value;
        }
        if (typeof value === "number") {
          return value !== 0;
        }
        if (typeof value === "string") {
          const normalized = value.trim().toLowerCase();
          if (!normalized) {
            return null;
          }
          if (["true", "1", "yes", "y", "on"].includes(normalized)) {
            return true;
          }
          if (["false", "0", "no", "n", "off"].includes(normalized)) {
            return false;
          }
        }
        return undefined;
      }
      case PrismaColumnType.REFERENCE: {
        if (typeof value === "string") {
          const trimmed = value.trim();
          return trimmed || undefined;
        }
        if (value && typeof value === "object") {
          const id = (value as Record<string, unknown>).id;
          if (typeof id === "string" && id.trim()) {
            return id.trim();
          }
        }
        return undefined;
      }
      default:
        return value;
    }
  }

  private prepareFilterArray(column: TableColumn, value: unknown): unknown[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const results = value
      .map((item) => this.prepareFilterValue(column, item))
      .filter((item): item is Exclude<unknown, undefined> => item !== undefined);

    return results.length ? results : undefined;
  }

  private isFilterEmpty(column: TableColumn, value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    switch (column.type) {
      case PrismaColumnType.TEXT:
      case PrismaColumnType.SELECT:
        return typeof value === "string" ? value.trim().length === 0 : false;
      case PrismaColumnType.DATE:
        return typeof value === "string" ? value.trim().length === 0 : false;
      case PrismaColumnType.NUMBER:
      case PrismaColumnType.BOOLEAN:
        return false;
      case PrismaColumnType.REFERENCE:
        if (typeof value === "string") {
          return value.trim().length === 0;
        }
        if (value && typeof value === "object") {
          const id = (value as Record<string, unknown>).id;
          return !(typeof id === "string" && id.trim().length > 0);
        }
        return true;
      default:
        return false;
    }
  }

  private compareEquality(column: TableColumn, actual: unknown, expected: unknown): boolean {
    switch (column.type) {
      case PrismaColumnType.NUMBER:
        return typeof actual === "number" && typeof expected === "number" && actual === expected;
      case PrismaColumnType.BOOLEAN:
        return typeof actual === "boolean" && typeof expected === "boolean" && actual === expected;
      case PrismaColumnType.DATE:
      case PrismaColumnType.TEXT:
      case PrismaColumnType.SELECT:
        return typeof actual === "string" && typeof expected === "string" && actual === expected;
      case PrismaColumnType.REFERENCE:
        if (typeof expected !== "string") {
          return false;
        }
        if (typeof actual === "string") {
          return actual === expected;
        }
        if (actual && typeof actual === "object") {
          const id = (actual as Record<string, unknown>).id;
          return typeof id === "string" && id === expected;
        }
        return false;
      default:
        return actual === expected;
    }
  }

  private getFilterString(column: TableColumn, value: unknown): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (column.type === PrismaColumnType.REFERENCE) {
      if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        if (typeof record.label === "string" && record.label.trim()) {
          return record.label.toLowerCase();
        }
        if (typeof record.id === "string" && record.id.trim()) {
          return record.id.toLowerCase();
        }
      }

      if (typeof value === "string") {
        return value.toLowerCase();
      }

      return undefined;
    }

    if (typeof value === "string") {
      return value.toLowerCase();
    }

    return String(value).toLowerCase();
  }

  private sortRows(
    rows: NormalizedRow[],
    sorts: TableQuerySort[],
    columnMap: Map<string, TableColumn>
  ): NormalizedRow[] {
    if (!sorts.length) {
      return [...rows].sort((a, b) => a.row.position - b.row.position);
    }

    const sorted = [...rows];

    sorted.sort((a, b) => {
      for (const sort of sorts) {
        const column = columnMap.get(sort.columnId);

        if (!column) {
          continue;
        }

        const comparison = this.compareForSort(
          column,
          a.values.get(column.id),
          b.values.get(column.id)
        );

        if (comparison !== 0) {
          return sort.direction === "asc" ? comparison : -comparison;
        }
      }

      return a.row.position - b.row.position;
    });

    return sorted;
  }

  private compareForSort(column: TableColumn, aValue: unknown, bValue: unknown): number {
    const aEmpty = this.isSortNull(column, aValue);
    const bEmpty = this.isSortNull(column, bValue);

    if (aEmpty && bEmpty) {
      return 0;
    }

    if (aEmpty) {
      return 1;
    }

    if (bEmpty) {
      return -1;
    }

    switch (column.type) {
      case PrismaColumnType.NUMBER:
        return (aValue as number) - (bValue as number);
      case PrismaColumnType.DATE: {
        const aTime = this.toTimestamp(aValue);
        const bTime = this.toTimestamp(bValue);
        if (aTime === undefined || bTime === undefined) {
          return 0;
        }
        return aTime - bTime;
      }
      case PrismaColumnType.BOOLEAN:
        return Number(Boolean(aValue)) - Number(Boolean(bValue));
      case PrismaColumnType.REFERENCE: {
        const aStr = this.getFilterString(column, aValue) ?? "";
        const bStr = this.getFilterString(column, bValue) ?? "";
        return aStr.localeCompare(bStr);
      }
      case PrismaColumnType.TEXT:
      case PrismaColumnType.SELECT:
      default: {
        const aStr = typeof aValue === "string" ? aValue : String(aValue ?? "");
        const bStr = typeof bValue === "string" ? bValue : String(bValue ?? "");
        return aStr.localeCompare(bStr);
      }
    }
  }

  private isSortNull(column: TableColumn, value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    if (column.type === PrismaColumnType.REFERENCE) {
      if (value && typeof value === "object") {
        const id = (value as Record<string, unknown>).id;
        return !(typeof id === "string" && id.trim().length > 0);
      }
      if (typeof value === "string") {
        return value.trim().length === 0;
      }
    }

    if (typeof value === "string") {
      return value.length === 0;
    }

    return false;
  }

  private toTimestamp(value: unknown): number | undefined {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? undefined : date.getTime();
    }
    if (value instanceof Date) {
      return value.getTime();
    }
    return undefined;
  }

  private sanitizeFilters(input: unknown): TableQueryFilter[] {
    if (!Array.isArray(input)) {
      return [];
    }

    const operatorSet = new Set(FILTER_OPERATORS);
    const sanitized: TableQueryFilter[] = [];

    for (const item of input) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const columnId = typeof (item as Record<string, unknown>).columnId === "string"
        ? ((item as Record<string, unknown>).columnId as string)
        : undefined;
      const operator = typeof (item as Record<string, unknown>).operator === "string"
        ? ((item as Record<string, unknown>).operator as string)
        : undefined;

      if (!columnId || !operator || !operatorSet.has(operator as TableQueryFilter["operator"])) {
        continue;
      }

      const filter: TableQueryFilter = {
        columnId,
        operator: operator as TableQueryFilter["operator"]
      };

      if ("value" in (item as Record<string, unknown>)) {
        filter.value = (item as Record<string, unknown>).value;
      }

      sanitized.push(filter);
    }

    return sanitized;
  }

  private sanitizeSorts(input: unknown): TableQuerySort[] {
    if (!Array.isArray(input)) {
      return [];
    }

    const sanitized: TableQuerySort[] = [];

    for (const item of input) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const columnId = typeof (item as Record<string, unknown>).columnId === "string"
        ? ((item as Record<string, unknown>).columnId as string)
        : undefined;
      const direction = (item as Record<string, unknown>).direction;

      if (!columnId || (direction !== "asc" && direction !== "desc")) {
        continue;
      }

      sanitized.push({ columnId, direction });
    }

    return sanitized;
  }

  private formatValueForExport(type: PrismaColumnType, value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }

    switch (type) {
      case PrismaColumnType.NUMBER: {
        const numberValue = typeof value === "number" ? value : Number(value);
        return Number.isFinite(numberValue) ? numberValue.toString() : "";
      }
      case PrismaColumnType.DATE:
        if (typeof value === "string") {
          const parsed = new Date(value);
          return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        {
          const date = new Date(value as string);
          return Number.isNaN(date.getTime()) ? "" : date.toISOString();
        }
      case PrismaColumnType.BOOLEAN:
        if (typeof value === "boolean") {
          return value ? "true" : "false";
        }
        if (typeof value === "number") {
          return value !== 0 ? "true" : "false";
        }
        if (typeof value === "string") {
          const normalized = value.toLowerCase();
          if (["true", "1", "yes", "y", "on"].includes(normalized)) {
            return "true";
          }
          if (["false", "0", "no", "n", "off"].includes(normalized)) {
            return "false";
          }
        }
        return "";
      case PrismaColumnType.SELECT:
        if (typeof value === "string") {
          return value;
        }
        if (value && typeof value === "object" && "value" in (value as Record<string, unknown>)) {
          const record = value as Record<string, unknown>;
          if (typeof record.value === "string") {
            return record.value;
          }
        }
        return String(value);
      case PrismaColumnType.REFERENCE:
        if (value && typeof value === "object") {
          const record = value as Record<string, unknown>;
          const label = typeof record.label === "string" && record.label.trim().length
            ? record.label
            : undefined;
          const id = typeof record.id === "string" ? record.id : undefined;
          return label ?? id ?? "";
        }
        return typeof value === "string" ? value : "";
      case PrismaColumnType.TEXT:
      default:
        return String(value);
    }
  }

  private async buildQueryContext(
    orgId: string,
    tableId: string,
    options: TableQueryRequest
  ): Promise<{ visibleColumns: TableColumn[]; rows: NormalizedRow[]; total: number }> {
    const table = await this.prisma.dataTable.findFirst({
      where: { id: tableId, orgId },
      include: {
        columns: {
          orderBy: { position: "asc" }
        },
        rows: {
          orderBy: { position: "asc" },
          include: { cells: true }
        },
        views: true
      }
    });

    if (!table) {
      throw new NotFoundException("Table not found");
    }

    const columnMap = new Map(table.columns.map((column) => [column.id, column] as const));

    let viewConfig: ViewConfig = {};

    if (options.viewId) {
      const view = table.views.find((item) => item.id === options.viewId);

      if (!view) {
        throw new NotFoundException("View not found");
      }

      viewConfig = this.parseViewConfig(view.config);
    }

    const mergedFilters = this.mergeFilters(viewConfig.filters, options.filters).filter((filter) =>
      columnMap.has(filter.columnId)
    );
    const mergedSorts = this.mergeSorts(viewConfig.sorts, options.sorts).filter((sort) =>
      columnMap.has(sort.columnId)
    );

    const orderedColumns = [...table.columns];

    if (viewConfig.columnOrder?.length) {
      const orderMap = new Map(viewConfig.columnOrder.map((columnId, index) => [columnId, index] as const));
      orderedColumns.sort((a, b) => {
        const aOrder = orderMap.has(a.id) ? orderMap.get(a.id)! : Number.POSITIVE_INFINITY;
        const bOrder = orderMap.has(b.id) ? orderMap.get(b.id)! : Number.POSITIVE_INFINITY;

        if (aOrder === bOrder) {
          return a.position - b.position;
        }

        return aOrder - bOrder;
      });
    }

    const hiddenColumns = new Set(viewConfig.hidden ?? []);
    const visibleColumns = orderedColumns.filter((column) => !hiddenColumns.has(column.id));

    const normalizedRows = table.rows.map((row) => this.normalizeRow(row, table.columns));
    const filteredRows = mergedFilters.length
      ? normalizedRows.filter((entry) => this.matchesFilters(entry, mergedFilters, columnMap))
      : normalizedRows;
    const sortedRows = this.sortRows(filteredRows, mergedSorts, columnMap);

    return {
      visibleColumns,
      rows: sortedRows,
      total: sortedRows.length
    };
  }

  private parseViewConfig(config: unknown): ViewConfig {
    const record = this.sanitizeViewConfig(config);

    return {
      columnOrder: Array.isArray(record.columnOrder) ? (record.columnOrder as string[]) : undefined,
      hidden: Array.isArray(record.hidden) ? (record.hidden as string[]) : undefined,
      filters: Array.isArray(record.filters) ? (record.filters as TableQueryFilter[]) : undefined,
      sorts: Array.isArray(record.sorts) ? (record.sorts as TableQuerySort[]) : undefined
    };
  }

  private sanitizeViewConfig(config: unknown): Record<string, unknown> {
    if (!config || typeof config !== "object") {
      return {};
    }

    const record = { ...(config as Record<string, unknown>) };
    const sanitized: Record<string, unknown> = {};

    if ("columnOrder" in record) {
      const order = Array.isArray(record.columnOrder)
        ? (record.columnOrder as unknown[]).filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0
          )
        : [];

      if (order.length) {
        sanitized.columnOrder = order;
      }
    }

    if ("hidden" in record) {
      const hidden = Array.isArray(record.hidden)
        ? (record.hidden as unknown[]).filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0
          )
        : [];

      if (hidden.length) {
        sanitized.hidden = hidden;
      }
    }

    const filters = this.sanitizeFilters(record.filters);
    if (filters.length) {
      sanitized.filters = filters;
    }

    const sorts = this.sanitizeSorts(record.sorts);
    if (sorts.length) {
      sanitized.sorts = sorts;
    }

    for (const [key, value] of Object.entries(record)) {
      if (["columnOrder", "hidden", "filters", "sorts"].includes(key)) {
        continue;
      }

      sanitized[key] = value;
    }

    return sanitized;
  }
}
