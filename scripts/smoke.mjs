#!/usr/bin/env node
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const API_BASE = process.env.API_BASE;

if (!API_BASE) {
  console.error("[smoke] API_BASE environment variable is required");
  process.exit(1);
}

const checks = [
  {
    name: "List tables",
    path: "/admin/tables",
    allowedStatuses: new Set([200]),
    requireJsonBody: true
  },
  {
    name: "List sources",
    path: "/admin/sources",
    allowedStatuses: new Set([200]),
    requireJsonBody: true
  },
  {
    name: "Resolve host",
    path: "/public/resolve?host=app.astalla.com",
    allowedStatuses: new Set([200, 404]),
    requireJsonBody: true
  }
];

async function fetchJsonSafely(response) {
  const contentType = response.headers.get("content-type");

  if (!contentType || !contentType.toLowerCase().includes("application/json")) {
    throw new Error(`Expected JSON response but received content type: ${contentType ?? "unknown"}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to parse JSON body: ${(error && error.message) || error}`);
  }
}

async function runCheck(check) {
  const url = new URL(check.path, API_BASE);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!check.allowedStatuses.has(response.status)) {
    const body = await response.text();
    throw new Error(
      `${check.name} failed: received ${response.status} ${response.statusText}. Body: ${body.slice(0, 500)}`
    );
  }

  if (check.requireJsonBody) {
    await fetchJsonSafely(response);
  }

  console.log(`✔ ${check.name} (${response.status})`);
}

async function main() {
  const timeout = Number.parseInt(process.env.SMOKE_TIMEOUT ?? "30000", 10);
  const startedAt = Date.now();

  for (;;) {
    try {
      for (const check of checks) {
        await runCheck(check);
      }

      console.log("All smoke checks passed");
      return;
    } catch (error) {
      const elapsed = Date.now() - startedAt;

      if (elapsed >= timeout) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }

      console.warn(
        `Smoke check failed (${error instanceof Error ? error.message : error}). Retrying...`
      );
      await delay(1000);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
