/// <reference path="./prisma-client.d.ts" />

import "reflect-metadata";

import assert from "node:assert/strict";
import Module from "node:module";
import type { AddressInfo } from "node:net";

import { INestApplication, Module as NestModule, NotFoundException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

const originalLoad = (Module as unknown as { _load?: (...args: any[]) => any })._load;

if (typeof originalLoad === "function") {
  (Module as unknown as { _load: (...args: any[]) => any })._load = function patchPrisma(
    request: string,
    parent: NodeModule,
    isMain: boolean
  ) {
    if (request === "@prisma/client") {
      class PrismaClientStub {
        constructor(_options?: unknown) {}

        dataTable = {
          findMany: async () => [],
          findFirst: async () => null
        };

        async $connect() {
          return undefined;
        }

        async $disconnect() {
          return undefined;
        }
      }

      return {
        PrismaClient: PrismaClientStub,
        Prisma: {}
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };
}

const ReferenceLookupControllerModule = require("../src/reference-lookup/reference-lookup.controller") as typeof import("../src/reference-lookup/reference-lookup.controller");
const ReferenceLookupServiceModule = require("../src/reference-lookup/reference-lookup.service") as typeof import("../src/reference-lookup/reference-lookup.service");

const { ReferenceLookupController } = ReferenceLookupControllerModule;
const { ReferenceLookupService: ReferenceLookupServiceClass } = ReferenceLookupServiceModule;

type RegistryResponse = {
  tables: Array<{
    id: string;
    name: string;
    columns: Array<{ id: string; name: string; type: string }>;
  }>;
};

type TableChoices = Array<{ id: string; name: string; label?: string }>;

type ColumnChoices = Array<{ id: string; name: string; type: string }>;

interface ReferenceLookupServiceLike {
  getSchemaRegistry(orgId: string): Promise<RegistryResponse>;
  getTableChoices(orgId: string): Promise<TableChoices>;
  getColumnChoices(orgId: string, tableId: string): Promise<ColumnChoices>;
  getTableDetail(orgIdOrTableId: string, tableId?: string): Promise<TableDetail>;
}

const registryStub: RegistryResponse = {
  tables: [
    {
      id: "table-1",
      name: "Table One",
      columns: [
        { id: "col-1", name: "Column 1", type: "text" },
        { id: "col-2", name: "Column 2", type: "number" }
      ]
    }
  ]
};

const tableChoicesStub: TableChoices = [
  { id: "table-1", name: "Table One", label: "Table One" },
  { id: "table-2", name: "Table Two", label: "Table Two" }
];

const columnChoicesStub: ColumnChoices = [
  { id: "col-1", name: "Column 1", type: "text" },
  { id: "col-2", name: "Column 2", type: "number" }
];

type TableDetail = {
  id: string;
  name: string;
  columns: Array<{
    id: string;
    name: string;
    type: string;
    referenceConfig: Record<string, unknown> | null;
  }>;
};

const tableDetailStub: TableDetail = {
  id: "table-1",
  name: "Table One",
  columns: [
    {
      id: "col-1",
      name: "Column 1",
      type: "reference",
      referenceConfig: {
        targetTableId: "table-2",
        displayColumnId: "col-9",
        cardinality: "single",
        enforceForeignKey: true
      }
    },
    {
      id: "col-2",
      name: "Column 2",
      type: "text",
      referenceConfig: null
    }
  ]
};

const mockService: ReferenceLookupServiceLike = {
  async getSchemaRegistry(orgId: string) {
    assert.equal(orgId, "demo-org");
    return registryStub;
  },
  async getTableChoices(orgId: string) {
    assert.equal(orgId, "demo-org");
    return tableChoicesStub;
  },
  async getColumnChoices(orgId: string, tableId: string) {
    assert.equal(orgId, "demo-org");
    assert.equal(tableId, "table-1");
    return columnChoicesStub;
  },
  async getTableDetail(orgIdOrTableId: string, tableId?: string) {
    const [orgId, resolvedTableId] = tableId ? [orgIdOrTableId, tableId] : [null, orgIdOrTableId];
    if (orgId) {
      assert.equal(orgId, "demo-org");
    }
    assert.equal(resolvedTableId, "table-1");
    return tableDetailStub;
  }
};

@NestModule({
  controllers: [ReferenceLookupController],
  providers: [{ provide: ReferenceLookupServiceClass, useValue: mockService }]
})
class ReferenceLookupTestModule {}

let app: INestApplication | null = null;
let baseUrl: string | null = null;

async function ensureServer(): Promise<{ app: INestApplication; baseUrl: string }> {
  if (app && baseUrl) {
    return { app, baseUrl };
  }

  app = await NestFactory.create(ReferenceLookupTestModule, { logger: false });
  await app.init();
  await app.listen(0);

  const server = app.getHttpServer();
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  return { app, baseUrl };
}

const results: { name: string; error?: Error }[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name });
  } catch (error) {
    results.push({ name, error: error instanceof Error ? error : new Error(String(error)) });
  }
}

async function testSchemaRegistryEndpoint() {
  const { baseUrl } = await ensureServer();
  const response = await fetch(`${baseUrl}/api/schema/registry`);
  assert.equal(response.status, 200);
  const payload = (await response.json()) as RegistryResponse;
  assert.deepEqual(payload, registryStub);
}

async function testTableChoicesEndpoint() {
  const { baseUrl } = await ensureServer();
  const response = await fetch(`${baseUrl}/api/tables/choices`);
  assert.equal(response.status, 200);
  const payload = (await response.json()) as TableChoices;
  assert.deepEqual(payload, tableChoicesStub);
}

async function testColumnChoicesEndpoint() {
  const { baseUrl } = await ensureServer();
  const response = await fetch(
    `${baseUrl}/api/tables/${encodeURIComponent("table-1")}/columns/choices`
  );
  assert.equal(response.status, 200);
  const payload = (await response.json()) as ColumnChoices;
  assert.deepEqual(payload, columnChoicesStub);
}

async function testTableDetailEndpoint() {
  const { baseUrl } = await ensureServer();
  const response = await fetch(`${baseUrl}/api/tables/${encodeURIComponent("table-1")}`);
  assert.equal(response.status, 200);
  const payload = (await response.json()) as TableDetail;
  assert.deepEqual(payload, tableDetailStub);
  for (const column of payload.columns) {
    assert.ok(Object.prototype.hasOwnProperty.call(column, "referenceConfig"));
    assert.notEqual(column.referenceConfig, undefined);
  }
}

async function testTableDetailEndpointReturns404() {
  const { baseUrl } = await ensureServer();
  const original = mockService.getTableDetail;
  mockService.getTableDetail = async () => {
    throw new NotFoundException("Table missing");
  };

  try {
    const response = await fetch(`${baseUrl}/api/tables/${encodeURIComponent("missing-table")}`);
    assert.equal(response.status, 404);
    const payload = (await response.json()) as { message?: string };
    assert.equal(payload.message, "Table missing");
  } finally {
    mockService.getTableDetail = original;
  }
}

async function testServiceNormalizesNullColumnType() {
  const prismaStub = {
    dataTable: {
      async findMany() {
        return [];
      },
      async findFirst() {
        return null;
      },
      async findUnique(args: unknown) {
        const id = (args as { where?: { id?: string } } | undefined)?.where?.id;
        if (id === "table-null-type") {
          return {
            id: "table-null-type",
            orgId: "demo-org",
            name: "Table Null Type",
            columns: [
              {
                id: "col-null",
                name: "Null Type",
                type: null,
                config: null,
                referenceConfig: null
              }
            ]
          };
        }
        return null;
      }
    },
    tableColumn: {
      async findFirst() {
        return null;
      },
      async update() {
        return null;
      }
    }
  };

  const service = new ReferenceLookupServiceClass(prismaStub as any);
  const detail = await service.getTableDetail("table-null-type");
  const [column] = detail.columns;
  assert.equal(column?.type, "text");
}

async function main() {
  await runTest("GET /api/schema/registry returns the schema graph", testSchemaRegistryEndpoint);
  await runTest("GET /api/tables/choices returns table choices", testTableChoicesEndpoint);
  await runTest(
    "GET /api/tables/:tableId/columns/choices returns column choices",
    testColumnChoicesEndpoint
  );
  await runTest("GET /api/tables/:tableId returns table detail", testTableDetailEndpoint);
  await runTest(
    "GET /api/tables/:tableId returns 404 when the table is missing",
    testTableDetailEndpointReturns404
  );
  await runTest(
    "ReferenceLookupService getTableDetail normalizes null column types to text",
    testServiceNormalizesNullColumnType
  );

  for (const result of results) {
    if (result.error) {
      console.error(`FAIL ${result.name}:`, result.error.message);
    } else {
      console.log(`PASS ${result.name}`);
    }
  }

  const failed = results.filter((result) => result.error);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main().finally(async () => {
  if (app) {
    await app.close();
  }
});
