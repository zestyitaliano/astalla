import "reflect-metadata";

import assert from "node:assert/strict";
import Module from "node:module";

const originalModuleLoad = (Module as unknown as { _load?: (...args: any[]) => any })._load;

if (typeof originalModuleLoad === "function") {
  (Module as unknown as { _load: (...args: any[]) => any })._load = function patchPrisma(
    request: string,
    parent: NodeModule,
    isMain: boolean
  ) {
    if (request === "@prisma/client") {
      const SourceAccountType = {
        ENTRATA: "ENTRATA",
        GA4: "GA4",
        GOOGLE_ADS: "GOOGLE_ADS",
        GBP: "GBP",
        WORDPRESS: "WORDPRESS"
      } as const;

      class PrismaClient {}

      const Prisma = {
        JsonNull: Symbol.for("JsonNull"),
        SourceAccountType
      };

      return { PrismaClient, Prisma, SourceAccountType };
    }

    return originalModuleLoad.call(this, request, parent, isMain);
  };
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SourcesService } = require("../src/sources/sources.service");

interface TestResult {
  name: string;
  error?: Error;
}

const results: TestResult[] = [];

async function testCredentialPatchRetainsExistingSecrets() {
  const configServiceStub = {
    get: (key: string) => {
      if (key === "devMocks") {
        return false;
      }
      return undefined;
    }
  };

  const jobsServiceStub = { enqueueEtlRun: async () => false };
  const providerStub = { validate: async () => ({ ok: true }) };

  let storedRecord: any;
  let lastUpdateData: any;

  const prismaStub = {
    sourceAccount: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        assert.ok(storedRecord, "expected stored record to be defined");
        assert.equal(where.id, storedRecord.id);
        return storedRecord;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        assert.equal(where.id, storedRecord.id);
        lastUpdateData = data;
        return { ...storedRecord };
      }
    }
  };

  const service = new SourcesService(
    prismaStub as any,
    configServiceStub as any,
    jobsServiceStub as any,
    providerStub as any,
    providerStub as any,
    providerStub as any,
    providerStub as any
  );

  const now = new Date();
  const existingCredential = {
    clientId: "abc123",
    clientSecret: "prev-secret",
    refreshToken: "keep-me"
  };

  storedRecord = {
    id: "source-1",
    propertyId: "property-1",
    type: "GA4",
    credential: (service as any).encryptCredential(existingCredential),
    name: "Test Source",
    status: "CONNECTED",
    lastSuccessAt: now,
    lastErrorAt: null,
    enabled: true,
    createdAt: now,
    updatedAt: now
  };

  (service as any).validateAndUpdate = async () => ({
    source: storedRecord,
    validation: { ok: true, message: undefined }
  });

  await service.update(storedRecord.id, {
    credential: {
      clientSecret: "  updated-secret  "
    }
  });

  assert.ok(lastUpdateData, "expected update call");

  const merged = (service as any).decryptCredential(lastUpdateData.credential);

  assert.deepEqual(merged, {
    clientId: "abc123",
    clientSecret: "updated-secret",
    refreshToken: "keep-me"
  });
}

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name });
  } catch (error) {
    results.push({ name, error: error instanceof Error ? error : new Error(String(error)) });
  }
}

async function main() {
  await runTest(
    "SourcesService.update preserves untouched credential fields",
    testCredentialPatchRetainsExistingSecrets
  );

  const failed = results.filter((result) => result.error);

  for (const result of results) {
    if (result.error) {
      console.error(`FAIL ${result.name}:`, result.error.message);
    } else {
      console.log(`PASS ${result.name}`);
    }
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
