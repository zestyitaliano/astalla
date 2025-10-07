import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ColumnType as PrismaColumnType, Prisma, TableColumn } from "@prisma/client";
import {
  CreateColumnDto,
  CreateRowDto,
  CreateTableDto,
  CreateViewDto,
  PatchCellsDto,
  ReorderRowsDto,
  UpdateColumnDto,
  UpdateViewDto
} from "@shared/api";
import { PrismaService } from "../prisma/prisma.service";

const SAMPLE_ROW_LIMIT = 50;

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async createTable(orgId: string, actorId: string | null, dto: CreateTableDto) {
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
          config: dto.config ?? null
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
        data.config = dto.config;
      }

      if (dto.type && dto.type !== column.type) {
        data.type = dto.type as PrismaColumnType;
        if (dto.type !== PrismaColumnType.SELECT && dto.config === undefined) {
          data.config = null;
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

        const normalizedValue = this.normalizeIncomingValue(column.type, cell.value);

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
        cells: dto.cells
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

    const view = await this.prisma.tableView.create({
      data: {
        tableId: dto.tableId,
        name: dto.name,
        config: dto.config,
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

    const updated = await this.prisma.tableView.update({
      where: { id },
      data: {
        name: dto.name ?? view.name,
        config: dto.config ?? view.config
      }
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

  async exportCsv(orgId: string, tableId: string, viewId?: string) {
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

    let columns = [...table.columns];
    let hiddenColumns = new Set<string>();

    if (viewId) {
      const view = table.views.find((item) => item.id === viewId);

      if (!view) {
        throw new NotFoundException("View not found");
      }

      const config = this.parseViewConfig(view.config);

      if (config.columnOrder?.length) {
        const orderMap = new Map(config.columnOrder.map((columnId, index) => [columnId, index] as const));
        columns.sort((a, b) => {
          const aOrder = orderMap.has(a.id) ? orderMap.get(a.id)! : Number.POSITIVE_INFINITY;
          const bOrder = orderMap.has(b.id) ? orderMap.get(b.id)! : Number.POSITIVE_INFINITY;
          if (aOrder === bOrder) {
            return a.position - b.position;
          }
          return aOrder - bOrder;
        });
      }

      if (config.hidden?.length) {
        hiddenColumns = new Set(config.hidden);
      }
    }

    const visibleColumns = columns.filter((column) => !hiddenColumns.has(column.id));
    const headers = visibleColumns.map((column) => column.name);

    const rows = table.rows.map((row) => {
      const cellMap = new Map(row.cells.map((cell) => [cell.columnId, cell.value] as const));
      return visibleColumns.map((column) =>
        this.formatValueForExport(column.type, cellMap.get(column.id))
      );
    });

    return { headers, rows };
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
              config: null
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

          const normalizedValue = this.normalizeIncomingValue(column.type, value);

          if (normalizedValue === undefined) {
            return;
          }

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
        payload
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

  private normalizeIncomingValue(type: PrismaColumnType, value: unknown): unknown {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (type === PrismaColumnType.TEXT) {
      return typeof value === "string" ? value : String(value);
    }

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (!trimmed) {
        return null;
      }

      value = trimmed;
    }

    switch (type) {
      case PrismaColumnType.NUMBER: {
        const numberValue = typeof value === "number" ? value : Number(value);
        return Number.isFinite(numberValue) ? numberValue : null;
      }
      case PrismaColumnType.DATE: {
        const date = new Date(value as string);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
      }
      case PrismaColumnType.BOOLEAN: {
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
      }
      case PrismaColumnType.SELECT:
      case PrismaColumnType.REFERENCE: {
        if (typeof value === "string") {
          const trimmed = value.trim();
          if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
            try {
              return JSON.parse(trimmed);
            } catch {
              return value;
            }
          }
        }
        return value;
      }
      default:
        return value;
    }
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
          return value;
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
      case PrismaColumnType.REFERENCE:
        if (typeof value === "object") {
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        }
        return String(value);
      case PrismaColumnType.TEXT:
      default:
        return String(value);
    }
  }

  private parseViewConfig(config: unknown): {
    columnOrder?: string[];
    hidden?: string[];
  } {
    if (!config || typeof config !== "object") {
      return {};
    }

    const columnOrder = Array.isArray((config as Record<string, unknown>).columnOrder)
      ? ((config as Record<string, unknown>).columnOrder as unknown[])
          .filter((value) => typeof value === "string")
          .map((value) => value as string)
      : undefined;

    const hidden = Array.isArray((config as Record<string, unknown>).hidden)
      ? ((config as Record<string, unknown>).hidden as unknown[])
          .filter((value) => typeof value === "string")
          .map((value) => value as string)
      : undefined;

    return { columnOrder, hidden };
  }
}
