import "reflect-metadata";

import assert from "node:assert/strict";
import Module from "node:module";
import type { AddressInfo } from "node:net";

import { BadRequestException, HttpStatus, Module as NestModule } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

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

async function testHttpBasicLoginMissingIdentifier() {
  let serviceCalled = false;
  const authServiceStub = {
    login: async () => {
      serviceCalled = true;
      throw new Error("should not be called");
    }
  };

  @NestModule({
    controllers: [AuthController],
    providers: [{ provide: AuthService, useValue: authServiceStub }]
  })
  class TestAuthModule {}

  const app = await NestFactory.create(TestAuthModule, { logger: false });
  await app.init();
  await app.listen(0);

  try {
    const server = app.getHttpServer();
    const address = server.address();
    assert.ok(address && typeof address === "object", "expected HTTP server address");

    const { port } = address as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/auth/basic-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "secret" })
    });

    assert.equal(response.status, HttpStatus.BAD_REQUEST);
    const payload = (await response.json()) as Record<string, unknown>;

    assert.equal(payload.message, "identifier is required");
    assert.equal(serviceCalled, false, "AuthService.login should not be called for missing identifier");
  } finally {
    await app.close();
  }
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
  await runTest("POST /auth/basic-login without identifier returns 400", testHttpBasicLoginMissingIdentifier);

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
