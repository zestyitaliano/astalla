import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

export interface ReferenceLookupRegistryResponse {
  tables: Array<{
    id: string;
    name: string;
    columns: Array<{ id: string; name: string; type: string }>;
  }>;
}

export type ReferenceLookupTableChoice = {
  id: string;
  name: string;
  label?: string;
};

export type ReferenceLookupColumnChoice = {
  id: string;
  name: string;
  type: string;
};

type ColumnTypeValue = "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "REFERENCE" | string;

type ReferenceColumnConfig = {
  targetTableId: string;
  displayColumnId: string | null;
  cardinality: "single" | "multi";
  enforceForeignKey: boolean;
};

type ReferenceColumnConfigInput = {
  targetTableId?: string;
  displayColumnId?: string | null;
  cardinality?: "single" | "multi";
  enforceForeignKey?: boolean;
};

type TableWithColumns = {
  id: string;
  name: string;
  columns: Array<{ id: string; name: string; type: ColumnTypeValue }>;
};

type TableWithReferenceColumns = {
  id: string;
  name: string;
  columns: Array<{
    id: string;
    name: string;
    type: string | null;
    config: unknown | null;
    referenceConfig: unknown | null;
  }>;
};

@Injectable()
export class ReferenceLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchemaRegistry(orgId: string): Promise<ReferenceLookupRegistryResponse> {
    const tables = (await this.dataTable.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      include: {
        columns: {
          orderBy: { position: "asc" },
          select: { id: true, name: true, type: true }
        }
      }
    })) as TableWithColumns[];

    return {
      tables: tables.map((table) => ({
        id: table.id,
        name: table.name,
        columns: table.columns.map((column) => ({
          id: column.id,
          name: column.name,
          type: this.mapColumnType(column.type)
        }))
      }))
    };
  }

  async getTableChoices(orgId: string): Promise<ReferenceLookupTableChoice[]> {
    const tables = (await this.dataTable.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })) as Array<{ id: string; name: string }>;

    return tables.map((table) => {
      const label = table.name?.trim();
      return {
        id: table.id,
        name: table.name,
        ...(label ? { label } : {})
      };
    });
  }

  async getColumnChoices(
    orgId: string,
    tableIdentifier: string
  ): Promise<ReferenceLookupColumnChoice[]> {
    const table = (await this.dataTable.findFirst({
      where: {
        orgId,
        OR: [{ id: tableIdentifier }, { name: tableIdentifier }]
      },
      select: {
        columns: {
          orderBy: { position: "asc" },
          select: { id: true, name: true, type: true }
        }
      }
    })) as TableWithColumns | null;

    if (!table) {
      throw new NotFoundException("Table not found");
    }

    return table.columns.map((column) => ({
      id: column.id,
      name: column.name,
      type: this.mapColumnType(column.type)
    }));
  }

  async updateColumn(
    tableIdentifier: string,
    columnIdentifier: string,
    body: {
      type?: string;
      referenceConfig?: ReferenceColumnConfigInput | null;
    }
  ) {
    const table = (await this.dataTable.findFirst({
      where: {
        OR: [{ id: tableIdentifier }, { name: tableIdentifier }]
      },
      select: { id: true }
    })) as { id: string } | null;

    if (!table) {
      throw new NotFoundException("Table not found");
    }

    const column = (await this.tableColumn.findFirst({
      where: { id: columnIdentifier, tableId: table.id },
      select: { id: true, name: true, type: true, config: true, referenceConfig: true }
    })) as
      | {
          id: string;
          name: string;
          type: ColumnTypeValue;
          config: unknown;
          referenceConfig: unknown;
        }
      | null;

    if (!column) {
      throw new NotFoundException("Column not found");
    }

    const normalizedType = this.normalizeColumnType(body?.type);
    const existingConfig = this.parseReferenceConfig(column.referenceConfig ?? column.config);

    let referenceConfig: ReferenceColumnConfig | null;
    if (normalizedType === "reference") {
      referenceConfig = this.normalizeReferenceConfig(body?.referenceConfig, existingConfig);
      if (!referenceConfig) {
        throw new BadRequestException("referenceConfig is required when type is 'reference'.");
      }
    } else {
      referenceConfig = null;
      if (body?.referenceConfig !== undefined && body.referenceConfig !== null) {
        throw new BadRequestException("referenceConfig is only supported for reference columns.");
      }
    }

    const updateData: Record<string, unknown> = {
      type: normalizedType.toUpperCase()
    };

    if (referenceConfig) {
      const cloned = this.cloneJson(referenceConfig);
      updateData.config = cloned;
      updateData.referenceConfig = cloned;
    } else {
      updateData.config = Prisma.JsonNull;
      updateData.referenceConfig = Prisma.JsonNull;
    }

    const updated = (await this.tableColumn.update({
      where: { id: column.id },
      data: updateData,
      select: { id: true, name: true, type: true }
    })) as { id: string; name: string; type: ColumnTypeValue };

    return {
      id: updated.id,
      name: updated.name,
      type: this.mapColumnType(updated.type),
      ...(referenceConfig ? { referenceConfig } : {})
    };
  }

  async getTableDetail(orgId: string, tableId: string) {
    const table = (await this.dataTable.findFirst({
      where: { id: tableId, orgId },
      select: {
        id: true,
        name: true,
        columns: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, type: true, config: true, referenceConfig: true }
        }
      }
    })) as TableWithReferenceColumns | null;

    if (!table) {
      throw new NotFoundException(`Table ${tableId} not found`);
    }

    const normalized = {
      ...table,
      columns: table.columns.map((column) => {
        const rawType = column.type;
        const referenceConfig = this.parseReferenceConfig(
          column.referenceConfig ?? column.config
        );
        return {
          id: column.id,
          name: column.name,
          type: typeof rawType === "string" ? rawType.toLowerCase() : "",
          referenceConfig
        };
      })
    };

    return normalized;
  }

  private mapColumnType(type: ColumnTypeValue): string {
    const normalized = typeof type === "string" ? type.toUpperCase() : "";
    switch (normalized) {
      case "NUMBER":
        return "number";
      case "DATE":
        return "date";
      case "BOOLEAN":
        return "boolean";
      case "SELECT":
        return "select";
      case "REFERENCE":
        return "reference";
      default:
        return "text";
    }
  }

  private normalizeColumnType(rawType?: string): string {
    if (!rawType || typeof rawType !== "string") {
      return "reference";
    }

    const trimmed = rawType.trim().toLowerCase();
    return trimmed || "reference";
  }

  private normalizeReferenceConfig(
    patch: ReferenceColumnConfigInput | null | undefined,
    current: ReferenceColumnConfig | null
  ): ReferenceColumnConfig | null {
    if (patch === undefined) {
      return current;
    }

    if (patch === null) {
      return null;
    }

    const next: ReferenceColumnConfig = current
      ? { ...current }
      : { targetTableId: "", displayColumnId: null, cardinality: "single", enforceForeignKey: false };

    if (this.hasOwn(patch, "targetTableId")) {
      const target = patch.targetTableId;
      if (typeof target !== "string" || !target.trim()) {
        throw new BadRequestException("referenceConfig.targetTableId must be a non-empty string.");
      }
      next.targetTableId = target.trim();
    }

    if (this.hasOwn(patch, "displayColumnId")) {
      const display = patch.displayColumnId;
      if (display === null || display === undefined) {
        next.displayColumnId = null;
      } else if (typeof display === "string") {
        const trimmed = display.trim();
        next.displayColumnId = trimmed.length > 0 ? trimmed : null;
      } else {
        throw new BadRequestException("referenceConfig.displayColumnId must be a string or null.");
      }
    }

    if (this.hasOwn(patch, "cardinality")) {
      const cardinality = typeof patch.cardinality === "string" ? patch.cardinality.toLowerCase() : patch.cardinality;
      if (cardinality !== "single" && cardinality !== "multi") {
        throw new BadRequestException("referenceConfig.cardinality must be either 'single' or 'multi'.");
      }
      next.cardinality = cardinality;
    }

    if (this.hasOwn(patch, "enforceForeignKey")) {
      if (typeof patch.enforceForeignKey !== "boolean") {
        throw new BadRequestException("referenceConfig.enforceForeignKey must be a boolean.");
      }
      next.enforceForeignKey = patch.enforceForeignKey;
    }

    if (!next.targetTableId.trim()) {
      throw new BadRequestException("referenceConfig.targetTableId is required when type is 'reference'.");
    }

    next.targetTableId = next.targetTableId.trim();
    return next;
  }

  private parseReferenceConfig(value: unknown): ReferenceColumnConfig | null {
    if (value === null || value === undefined) {
      return null;
    }

    try {
      const plain = this.cloneJson(value) as ReferenceColumnConfigInput;
      return this.normalizeReferenceConfig(plain, null);
    } catch {
      return null;
    }
  }

  private cloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private hasOwn<T extends object, K extends PropertyKey>(value: T, key: K): value is T & Record<K, unknown> {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  private get dataTable() {
    // Casting avoids a hard dependency on generated Prisma types so tests can stub the client.
    return (this.prisma as unknown as {
      dataTable: {
        findMany: (args: unknown) => Promise<unknown>;
        findFirst: (args: unknown) => Promise<unknown>;
        findUnique: (args: unknown) => Promise<unknown>;
      };
    }).dataTable;
  }

  private get tableColumn() {
    return (this.prisma as unknown as {
      tableColumn: {
        findFirst: (args: unknown) => Promise<unknown>;
        update: (args: unknown) => Promise<unknown>;
      };
    }).tableColumn;
  }
}
