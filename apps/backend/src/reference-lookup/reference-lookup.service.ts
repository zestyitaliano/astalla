import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

interface RegistryResponse {
  tables: Array<{
    id: string;
    name: string;
    columns: Array<{ id: string; name: string; type: string }>;
  }>;
}

type ColumnTypeValue = "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "REFERENCE" | string;

type TableWithColumns = {
  id: string;
  name: string;
  columns: Array<{ id: string; name: string; type: ColumnTypeValue }>;
};

@Injectable()
export class ReferenceLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchemaRegistry(orgId: string): Promise<RegistryResponse> {
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

  async getTableChoices(orgId: string) {
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

  async getColumnChoices(orgId: string, tableIdentifier: string) {
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

  private get dataTable() {
    // Casting avoids a hard dependency on generated Prisma types so tests can stub the client.
    return (this.prisma as unknown as {
      dataTable: {
        findMany: (args: unknown) => Promise<unknown>;
        findFirst: (args: unknown) => Promise<unknown>;
      };
    }).dataTable;
  }
}
