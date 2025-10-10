import assert from "node:assert/strict";
import Module from "node:module";

import { BadRequestException } from "@nestjs/common";

const originalModuleLoad = (Module as unknown as { _load?: (...args: any[]) => any })._load;

if (typeof originalModuleLoad === "function") {
  (Module as unknown as { _load: (...args: any[]) => any })._load = function patchPrisma(
    request: string,
    parent: NodeModule,
    isMain: boolean
  ) {
    if (request === "@prisma/client") {
      const UserRole = { ORG_ADMIN: "ORG_ADMIN", ORG_MEMBER: "ORG_MEMBER" } as const;

      class PrismaClient {
        user = {
          findUnique: async () => null,
          findFirst: async () => null,
          update: async () => null
        };
      }

      return { PrismaClient, Prisma: { UserRole }, UserRole };
    }

    return originalModuleLoad.call(this, request, parent, isMain);
  };
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AuthController } = require("../src/auth/auth.controller");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AuthService } = require("../src/auth/auth.service");

const results: { name: string; error?: Error }[] = [];

async function testControllerMissingIdentifier() {
  const login = () => Promise.reject(new Error("should not be called"));
  const controller = new AuthController({ login } as any);

  let thrown: unknown;
  try {
    await controller.basicLogin({ password: "secret" } as any);
  } catch (error) {
    thrown = error;
  }

  assert.ok(thrown instanceof BadRequestException, `expected BadRequestException but received ${String(thrown)}`);
}

async function testServiceMissingIdentifier() {
  const prisma = {} as any;
  const configService = { get: () => undefined } as any;
  const service = new AuthService(prisma, configService);

  let thrown: unknown;
  try {
    await service.login({ identifier: "   ", password: "secret" } as any);
  } catch (error) {
    thrown = error;
  }

  assert.ok(thrown instanceof BadRequestException, "expected BadRequestException");
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
  await runTest("AuthController.basicLogin rejects missing identifier", testControllerMissingIdentifier);
  await runTest("AuthService.login rejects blank identifier", testServiceMissingIdentifier);

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
