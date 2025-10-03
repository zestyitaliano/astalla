import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  Prisma,
  TableAuditAction,
  TableColumnType,
  TableRole
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

type PrismaClientLike = Prisma.TransactionClient;

type TableWithRelations = Prisma.TableGetPayload<{
  include: {
    columns: true;
    rows: { include: { cells: true } };
    views: true;
    permissions: true;
    forms: true;
  };
}>;

type RowWithCells = Prisma.TableRowGetPayload<{
  include: { cells: true };
}>;

interface CreateTableInput {
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

interface UpdateTableInput {
  name?: string;
  userId?: string | null;
}

interface CreateColumnInput {
  name: string;
  type: TableColumnType;
  refTableId?: string | null;
  formulaExpr?: string | null;
  order?: number;
  userId?: string | null;
}

interface UpdateColumnInput {
  name?: string;
  type?: TableColumnType;
  refTableId?: string | null;
  formulaExpr?: string | null;
  order?: number;
  userId?: string | null;
}

interface CreateRowInput {
  values: Record<string, unknown>;
  userId?: string | null;
  order?: number;
}

interface UpdateRowInput {
  values: Record<string, unknown>;
  userId?: string | null;
}

interface ReorderRowsInput {
  rowIds: string[];
  userId?: string | null;
}

interface ReorderColumnsInput {
  columnIds: string[];
  userId?: string | null;
}

interface CreateViewInput {
  userId: string;
  name: string;
  configJson: Prisma.JsonValue;
}

interface UpdateViewInput {
  name?: string;
  configJson?: Prisma.JsonValue;
}

interface UpsertPermissionInput {
  role: TableRole;
  rowId?: string | null;
  columnId?: string | null;
  canRead: boolean;
  canWrite: boolean;
}

interface CreateFormInput {
  name: string;
  configJson: Prisma.JsonValue;
  isPublic?: boolean;
}

interface SubmitFormInput {
  values: Record<string, unknown>;
  actorId?: string | null;
}

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string) {
    const tables = await this.prisma.table.findMany({
      where: { orgId },
      include: {
        columns: { orderBy: { order: "asc" } },
        rows: { orderBy: { order: "asc" }, include: { cells: true } },
        views: true,
        permissions: true,
        forms: true
      },
      orderBy: { createdAt: "asc" }
    });

    return tables.map((table) => this.serializeTable(table));
  }

  async get(tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: {
        columns: { orderBy: { order: "asc" } },
        rows: { orderBy: { order: "asc" }, include: { cells: true } },
        views: true,
        permissions: true,
        forms: true
      }
    });

    if (!table) {
      throw new NotFoundException("Table not found");
    }

    return this.serializeTable(table);
  }

  async createTable(input: CreateTableInput) {
    if (!input.orgId) {
      throw new BadRequestException("orgId is required");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const table = await tx.table.create({
        data: {
          orgId: input.orgId,
          name: input.name
        }
      });

      if (input.columns?.length) {
        for (const [index, column] of input.columns.entries()) {
          const created = await tx.tableColumn.create({
            data: {
              tableId: table.id,
              name: column.name,
              type: column.type,
              refTableId: column.refTableId ?? null,
              formulaExpr: column.formulaExpr ?? null,
              order: index
            }
          });

          await this.logAudit(tx, {
            action: TableAuditAction.column_created,
            tableId: table.id,
            columnId: created.id,
            userId: input.userId ?? undefined,
            newValue: {
              name: column.name,
              type: column.type,
              refTableId: column.refTableId ?? null,
              formulaExpr: column.formulaExpr ?? null,
              order: created.order
            }
          });
        }
      }

      return table.id;
    });

    return this.get(result);
  }

  async updateTable(tableId: string, input: UpdateTableInput) {
    await this.ensureTableExists(tableId);

    if (typeof input.name === "string") {
      await this.prisma.table.update({
        where: { id: tableId },
        data: { name: input.name }
      });

      await this.logAudit(this.prisma, {
        tableId,
        action: TableAuditAction.table_updated,
        userId: input.userId ?? undefined,
        newValue: { name: input.name }
      });
    }

    return this.get(tableId);
  }

  async deleteTable(tableId: string) {
    await this.ensureTableExists(tableId);
    await this.prisma.table.delete({ where: { id: tableId } });
  }

  async createColumn(tableId: string, input: CreateColumnInput) {
    await this.ensureTableExists(tableId);

    const column = await this.prisma.$transaction(async (tx) => {
      const order =
        typeof input.order === "number"
          ? input.order
          : await tx.tableColumn.count({ where: { tableId } });

      const created = await tx.tableColumn.create({
        data: {
          tableId,
          name: input.name,
          type: input.type,
          refTableId: input.refTableId ?? null,
          formulaExpr: input.formulaExpr ?? null,
          order
        }
      });

      const existingRows = await tx.tableRow.findMany({ where: { tableId }, select: { id: true } });
      for (const row of existingRows) {
        await tx.tableCell.create({
          data: {
            rowId: row.id,
            columnId: created.id,
            valueJson: Prisma.JsonNull
          }
        });
      }

      await this.logAudit(tx, {
        tableId,
        columnId: created.id,
        action: TableAuditAction.column_created,
        userId: input.userId ?? undefined,
        newValue: {
          name: input.name,
          type: input.type,
          refTableId: input.refTableId ?? null,
          formulaExpr: input.formulaExpr ?? null,
          order: created.order
        }
      });

      return created;
    });

    return column;
  }

  async updateColumn(columnId: string, input: UpdateColumnInput) {
    const column = await this.prisma.tableColumn.findUnique({ where: { id: columnId } });
    if (!column) {
      throw new NotFoundException("Column not found");
    }

    await this.prisma.tableColumn.update({
      where: { id: columnId },
      data: {
        name: input.name,
        type: input.type,
        refTableId: input.refTableId ?? null,
        formulaExpr: input.formulaExpr ?? null,
        order: input.order ?? column.order
      }
    });

    await this.logAudit(this.prisma, {
      tableId: column.tableId,
      columnId,
      action: TableAuditAction.column_updated,
      userId: input.userId ?? undefined,
      oldValue: column,
      newValue: {
        name: input.name ?? column.name,
        type: input.type ?? column.type,
        refTableId: input.refTableId ?? column.refTableId,
        formulaExpr: input.formulaExpr ?? column.formulaExpr,
        order: input.order ?? column.order
      }
    });
  }

  async deleteColumn(columnId: string, userId?: string | null) {
    const column = await this.prisma.tableColumn.findUnique({ where: { id: columnId } });
    if (!column) {
      throw new NotFoundException("Column not found");
    }

    await this.prisma.tableColumn.delete({ where: { id: columnId } });

    await this.logAudit(this.prisma, {
      tableId: column.tableId,
      columnId,
      action: TableAuditAction.column_deleted,
      userId: userId ?? undefined,
      oldValue: column
    });
  }

  async reorderColumns(tableId: string, input: ReorderColumnsInput) {
    const existing = await this.prisma.tableColumn.findMany({ where: { tableId } });
    const existingIds = new Set(existing.map((column) => column.id));

    for (const id of input.columnIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Column ${id} does not belong to table ${tableId}`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [order, id] of input.columnIds.entries()) {
        await tx.tableColumn.update({ where: { id }, data: { order } });
      }

      await this.logAudit(tx, {
        tableId,
        action: TableAuditAction.column_updated,
        userId: input.userId ?? undefined,
        newValue: { order: input.columnIds }
      });
    });
  }

  async createRow(tableId: string, input: CreateRowInput) {
    await this.ensureTableExists(tableId);

    const rowValues = input.values ?? {};
    const columns = await this.prisma.tableColumn.findMany({ where: { tableId }, select: { id: true } });
    const columnIds = new Set(columns.map((column) => column.id));
    const invalidKeys = Object.keys(rowValues).filter((key) => !columnIds.has(key));
    if (invalidKeys.length) {
      throw new BadRequestException(`Invalid column ids: ${invalidKeys.join(", ")}`);
    }

    const rowId = await this.prisma.$transaction(async (tx) => {
      const order =
        typeof input.order === "number"
          ? input.order
          : await tx.tableRow.count({ where: { tableId } });

      const row = await tx.tableRow.create({ data: { tableId, order } });
      await this.upsertRowCells(tx, tableId, row.id, rowValues);

      await this.logAudit(tx, {
        tableId,
        rowId: row.id,
        action: TableAuditAction.row_created,
        userId: input.userId ?? undefined,
        newValue: input.values
      });

      return row.id;
    });

    return this.getRow(rowId);
  }

  async updateRow(rowId: string, input: UpdateRowInput) {
    const row = await this.prisma.tableRow.findUnique({ where: { id: rowId }, include: { table: true } });
    if (!row) {
      throw new NotFoundException("Row not found");
    }

    const rowValues = input.values ?? {};
    const columns = await this.prisma.tableColumn.findMany({ where: { tableId: row.tableId }, select: { id: true } });
    const columnIds = new Set(columns.map((column) => column.id));
    const invalidKeys = Object.keys(rowValues).filter((key) => !columnIds.has(key));
    if (invalidKeys.length) {
      throw new BadRequestException(`Invalid column ids: ${invalidKeys.join(", ")}`);
    }

    await this.prisma.$transaction(async (tx) => {
      const before = await tx.tableCell.findMany({ where: { rowId } });
      await this.upsertRowCells(tx, row.tableId, rowId, rowValues);
      const after = await tx.tableCell.findMany({ where: { rowId } });

      const changedCells: Array<{ columnId: string; oldValue: Prisma.JsonValue | null; newValue: Prisma.JsonValue | null }> = [];

      const afterMap = new Map(after.map((cell) => [cell.columnId, cell.valueJson]));
      for (const cell of before) {
        const nextValue = afterMap.get(cell.columnId);
        if (!this.areJsonValuesEqual(cell.valueJson, nextValue)) {
          changedCells.push({ columnId: cell.columnId, oldValue: cell.valueJson, newValue: nextValue ?? Prisma.JsonNull });
        }
      }

      for (const change of changedCells) {
        await this.logAudit(tx, {
          tableId: row.tableId,
          rowId,
          columnId: change.columnId,
          action: TableAuditAction.cell_updated,
          userId: input.userId ?? undefined,
          oldValue: change.oldValue ?? Prisma.JsonNull,
          newValue: change.newValue ?? Prisma.JsonNull
        });
      }

      await this.logAudit(tx, {
        tableId: row.tableId,
        rowId,
        action: TableAuditAction.row_updated,
        userId: input.userId ?? undefined,
        newValue: rowValues
      });
    });

    return this.getRow(rowId);
  }

  async deleteRow(rowId: string, userId?: string | null) {
    const row = await this.prisma.tableRow.findUnique({ where: { id: rowId } });
    if (!row) {
      throw new NotFoundException("Row not found");
    }

    await this.prisma.tableRow.delete({ where: { id: rowId } });

    await this.logAudit(this.prisma, {
      tableId: row.tableId,
      rowId,
      action: TableAuditAction.row_deleted,
      userId: userId ?? undefined
    });
  }

  async reorderRows(tableId: string, input: ReorderRowsInput) {
    const existing = await this.prisma.tableRow.findMany({ where: { tableId } });
    const existingIds = new Set(existing.map((row) => row.id));

    for (const rowId of input.rowIds) {
      if (!existingIds.has(rowId)) {
        throw new BadRequestException(`Row ${rowId} does not belong to table ${tableId}`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [order, id] of input.rowIds.entries()) {
        await tx.tableRow.update({ where: { id }, data: { order } });
      }

      await this.logAudit(tx, {
        tableId,
        action: TableAuditAction.row_updated,
        userId: input.userId ?? undefined,
        newValue: { order: input.rowIds }
      });
    });
  }

  async listViews(tableId: string) {
    await this.ensureTableExists(tableId);
    return this.prisma.tableView.findMany({ where: { tableId }, orderBy: { createdAt: "asc" } });
  }

  async createView(tableId: string, input: CreateViewInput) {
    await this.ensureTableExists(tableId);
    return this.prisma.tableView.create({
      data: {
        tableId,
        userId: input.userId,
        name: input.name,
        configJson: input.configJson
      }
    });
  }

  async updateView(viewId: string, input: UpdateViewInput) {
    const view = await this.prisma.tableView.findUnique({ where: { id: viewId } });
    if (!view) {
      throw new NotFoundException("View not found");
    }

    return this.prisma.tableView.update({
      where: { id: viewId },
      data: {
        name: input.name ?? view.name,
        configJson: input.configJson ?? view.configJson
      }
    });
  }

  async deleteView(viewId: string) {
    const view = await this.prisma.tableView.findUnique({ where: { id: viewId } });
    if (!view) {
      throw new NotFoundException("View not found");
    }

    await this.prisma.tableView.delete({ where: { id: viewId } });
  }

  async listPermissions(tableId: string) {
    await this.ensureTableExists(tableId);
    return this.prisma.tablePermission.findMany({ where: { tableId } });
  }

  async setPermissions(tableId: string, permissions: UpsertPermissionInput[]) {
    await this.ensureTableExists(tableId);

    await this.prisma.$transaction(async (tx) => {
      await tx.tablePermission.deleteMany({ where: { tableId } });

      if (!permissions.length) {
        return;
      }

      const rowIds = permissions.filter((item) => item.rowId).map((item) => item.rowId as string);
      const columnIds = permissions.filter((item) => item.columnId).map((item) => item.columnId as string);

      if (rowIds.length) {
        const rows = await tx.tableRow.findMany({ where: { id: { in: rowIds } } });
        const missing = rowIds.filter((id) => !rows.some((row) => row.id === id));
        if (missing.length) {
          throw new BadRequestException(`Rows not found: ${missing.join(", ")}`);
        }

        const mismatched = rows.filter((row) => row.tableId !== tableId);
        if (mismatched.length) {
          throw new BadRequestException(
            `Rows do not belong to table: ${mismatched.map((row) => row.id).join(", ")}`
          );
        }
      }

      if (columnIds.length) {
        const columns = await tx.tableColumn.findMany({ where: { id: { in: columnIds } } });
        const missing = columnIds.filter((id) => !columns.some((column) => column.id === id));
        if (missing.length) {
          throw new BadRequestException(`Columns not found: ${missing.join(", ")}`);
        }

        const mismatched = columns.filter((column) => column.tableId !== tableId);
        if (mismatched.length) {
          throw new BadRequestException(
            `Columns do not belong to table: ${mismatched.map((column) => column.id).join(", ")}`
          );
        }
      }

      await tx.tablePermission.createMany({
        data: permissions.map((permission) => ({
          tableId,
          role: permission.role,
          rowId: permission.rowId ?? null,
          columnId: permission.columnId ?? null,
          canRead: permission.canRead,
          canWrite: permission.canWrite
        }))
      });
    });

    return this.listPermissions(tableId);
  }

  async getHistory(tableId: string, filters: { rowId?: string; columnId?: string; limit?: number }) {
    await this.ensureTableExists(tableId);

    const history = await this.prisma.tableAudit.findMany({
      where: {
        tableId,
        rowId: filters.rowId,
        columnId: filters.columnId
      },
      orderBy: { createdAt: "desc" },
      take: filters.limit ?? 200
    });

    return history;
  }

  async listForms(tableId: string) {
    await this.ensureTableExists(tableId);
    return this.prisma.form.findMany({ where: { tableId }, orderBy: { createdAt: "desc" } });
  }

  async createForm(tableId: string, input: CreateFormInput) {
    await this.ensureTableExists(tableId);

    return this.prisma.form.create({
      data: {
        tableId,
        name: input.name,
        configJson: input.configJson,
        isPublic: Boolean(input.isPublic)
      }
    });
  }

  async getForm(formId: string) {
    const form = await this.prisma.form.findUnique({ where: { id: formId } });
    if (!form) {
      throw new NotFoundException("Form not found");
    }

    return form;
  }

  async submitForm(formId: string, input: SubmitFormInput) {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      include: {
        table: {
          include: {
            columns: { orderBy: { order: "asc" } }
          }
        }
      }
    });

    if (!form) {
      throw new NotFoundException("Form not found");
    }

    if (!form.isPublic && !input.actorId) {
      throw new ForbiddenException("Authentication required to submit this form");
    }

    const rowValues: Record<string, unknown> = {};
    for (const column of form.table.columns) {
      if (Object.prototype.hasOwnProperty.call(input.values, column.id)) {
        rowValues[column.id] = input.values[column.id];
      }
    }

    const row = await this.createRow(form.tableId, {
      values: rowValues,
      userId: input.actorId
    });

    await this.logAudit(this.prisma, {
      tableId: form.tableId,
      rowId: row.id,
      action: TableAuditAction.form_submitted,
      userId: input.actorId ?? undefined,
      newValue: { formId }
    });

    return row;
  }

  private async ensureTableExists(tableId: string) {
    const exists = await this.prisma.table.findUnique({ where: { id: tableId }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException("Table not found");
    }
  }

  private serializeTable(table: TableWithRelations) {
    return {
      id: table.id,
      orgId: table.orgId,
      name: table.name,
      createdAt: table.createdAt,
      columns: table.columns
        .sort((a, b) => a.order - b.order)
        .map((column) => ({
          id: column.id,
          tableId: column.tableId,
          name: column.name,
          type: column.type,
          refTableId: column.refTableId,
          formulaExpr: column.formulaExpr,
          order: column.order
        })),
      rows: table.rows
        .sort((a, b) => a.order - b.order)
        .map((row) => this.serializeRow(row, table.columns)),
      views: table.views,
      permissions: table.permissions,
      forms: table.forms
    };
  }

  private serializeRow(row: RowWithCells, columns: TableWithRelations["columns"]) {
    const cellMap: Record<string, unknown> = {};
    for (const cell of row.cells) {
      cellMap[cell.columnId] = cell.valueJson;
    }

    for (const column of columns) {
      if (!(column.id in cellMap)) {
        cellMap[column.id] = Prisma.JsonNull;
      }
    }

    return {
      id: row.id,
      tableId: row.tableId,
      order: row.order,
      createdAt: row.createdAt,
      values: cellMap
    };
  }

  private async getRow(rowId: string) {
    const row = await this.prisma.tableRow.findUnique({
      where: { id: rowId },
      include: { cells: true, table: { include: { columns: true } } }
    });

    if (!row) {
      throw new NotFoundException("Row not found");
    }

    return {
      id: row.id,
      tableId: row.tableId,
      order: row.order,
      createdAt: row.createdAt,
      values: row.cells.reduce<Record<string, unknown>>((acc, cell) => {
        acc[cell.columnId] = cell.valueJson;
        return acc;
      }, {})
    };
  }

  private async upsertRowCells(
    client: PrismaClientLike,
    tableId: string,
    rowId: string,
    values: Record<string, unknown>
  ) {
    const columns = await client.tableColumn.findMany({
      where: { tableId },
      orderBy: { order: "asc" }
    });

    for (const column of columns) {
      const value = Object.prototype.hasOwnProperty.call(values, column.id)
        ? (values[column.id] as Prisma.JsonValue)
        : Prisma.JsonNull;

      const existing = await client.tableCell.findFirst({
        where: {
          rowId,
          columnId: column.id
        }
      });

      if (existing) {
        await client.tableCell.update({
          where: { id: existing.id },
          data: { valueJson: value }
        });
      } else {
        await client.tableCell.create({
          data: {
            rowId,
            columnId: column.id,
            valueJson: value
          }
        });
      }
    }
  }

  private async logAudit(
    client: PrismaClientLike | PrismaService,
    entry: {
      tableId: string;
      action: TableAuditAction;
      rowId?: string;
      columnId?: string;
      userId?: string;
      oldValue?: Prisma.JsonValue | null;
      newValue?: Prisma.JsonValue | null;
    }
  ) {
    await client.tableAudit.create({
      data: {
        tableId: entry.tableId,
        rowId: entry.rowId ?? null,
        columnId: entry.columnId ?? null,
        userId: entry.userId ?? null,
        action: entry.action,
        oldValue: entry.oldValue ?? Prisma.JsonNull,
        newValue: entry.newValue ?? Prisma.JsonNull
      }
    });
  }

  private areJsonValuesEqual(a: Prisma.JsonValue | null | undefined, b: Prisma.JsonValue | null | undefined) {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }
}
