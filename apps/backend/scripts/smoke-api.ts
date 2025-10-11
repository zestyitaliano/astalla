import { existsSync } from "node:fs";
import path from "node:path";

import axios from "axios";
import { config as loadEnv } from "dotenv";
import { NestFactory } from "@nestjs/core";
import { json } from "express";

import { AppModule } from "../src/app.module";

function loadTestEnvironment() {
  if (process.env.NODE_ENV === "test") {
    const envPath = path.resolve(__dirname, "..", ".env.test");
    if (existsSync(envPath)) {
      loadEnv({ path: envPath, override: false });
      return;
    }
  }

  loadEnv({ override: false });
}

async function startNestApplication() {
  const desiredPort = Number.parseInt(process.env.SMOKE_TEST_PORT ?? process.env.PORT ?? "4001", 10);
  process.env.PORT = String(desiredPort);
  process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
  process.env.DEV_MOCKS = process.env.DEV_MOCKS || "true";

  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });
  app.use(json({ limit: "10mb" }));

  const allowedOrigins = Array.from(
    new Set([
      process.env.FRONTEND_ORIGIN,
      "http://localhost:3000",
      "https://app.astalla.com"
    ].filter(Boolean))
  );

  app.enableCors({
    origin: allowedOrigins,
    credentials: true
  });

  const server = await app.listen(desiredPort);
  const address = server.address();
  const resolvedPort = typeof address === "object" && address !== null ? address.port : desiredPort;
  const baseURL = `http://127.0.0.1:${resolvedPort}`;

  return { app, baseURL };
}

async function main() {
  loadTestEnvironment();

  const { app, baseURL } = await startNestApplication();
  const client = axios.create({
    baseURL,
    validateStatus: () => true
  });

  const adminEmail = (process.env.ADMIN_TEST_LOGIN_EMAIL || "admin@astalla.com").toLowerCase();
  const adminPassword = process.env.ADMIN_TEST_LOGIN_PASSWORD || "Astalla2025!";

  const results: { name: string; ok: boolean; detail?: string }[] = [];
  let accessToken = "";

  async function runCheck(name: string, task: () => Promise<void>) {
    try {
      await task();
      results.push({ name, ok: true });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      results.push({ name, ok: false, detail });
    }
  }

  await runCheck("credentials login", async () => {
    const response = await client.post(
      "/auth/basic-login",
      { identifier: adminEmail, password: adminPassword },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      throw new Error(`expected 200 but received ${response.status}`);
    }

    if (!response.data || typeof response.data !== "object") {
      throw new Error("response body missing");
    }

    const token = (response.data as Record<string, unknown>).access_token;
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("access_token missing in response");
    }

    accessToken = token;
  });

  await runCheck("health/auth", async () => {
    const response = await client.get("/health/auth");
    if (response.status !== 200) {
      throw new Error(`expected 200 but received ${response.status}`);
    }

    const data = response.data as Record<string, unknown>;
    if (typeof data !== "object" || data === null) {
      throw new Error("health payload not an object");
    }

    if (!("seedAdminExists" in data) || typeof data.seedAdminExists !== "boolean") {
      throw new Error("seedAdminExists boolean missing");
    }

    if (!("env" in data) || typeof data.env !== "object" || data.env === null) {
      throw new Error("env status missing");
    }

    const envData = data.env as Record<string, unknown>;
    if (typeof envData.hasJwtSecret !== "boolean" || typeof envData.hasEncryptionKey !== "boolean") {
      throw new Error("env flags missing");
    }
  });

  await runCheck("metrics/occupancy", async () => {
    const response = await client.get("/metrics/occupancy", {
      params: { propertyId: "prop-harbor", window: 30 }
    });

    if (response.status !== 200) {
      throw new Error(`expected 200 but received ${response.status}`);
    }

    const data = response.data as Record<string, unknown>;
    if (typeof data !== "object" || data === null) {
      throw new Error("occupancy payload not an object");
    }

    if (typeof data.occupancyRate !== "number") {
      throw new Error("occupancyRate missing or not a number");
    }
  });

  await runCheck("admin/sources unauthorized", async () => {
    const response = await client.get("/admin/sources");
    if (response.status !== 401) {
      throw new Error(`expected 401 but received ${response.status}`);
    }
  });

  await runCheck("admin/sources authorized", async () => {
    if (!accessToken) {
      throw new Error("missing access token from login");
    }

    const response = await client.get("/admin/sources", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (response.status !== 200) {
      throw new Error(`expected 200 but received ${response.status}`);
    }

    const data = response.data as Record<string, unknown>;
    if (!data || typeof data.sources === "undefined") {
      throw new Error("sources field missing from response");
    }

    if (!Array.isArray((data as { sources?: unknown }).sources)) {
      throw new Error("sources field is not an array");
    }
  });

  const hasFailure = results.some((result) => !result.ok);
  console.log("[smoke-api] Summary");
  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    const detail = result.detail ? ` - ${result.detail}` : "";
    console.log(`  [${status}] ${result.name}${detail}`);
  }

  await app.close();

  if (hasFailure) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[smoke-api] unexpected error", error);
  process.exitCode = 1;
});
