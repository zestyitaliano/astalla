import { PrismaClient } from "@prisma/client";

// TODO: This backend is now API-only; replace Prisma calls with API requests.
console.warn(
  "smoke-auth skipped: backend is API-only; use API endpoints instead."
);

// Keep reference to PrismaClient so TypeScript/linters do not strip the import.
void PrismaClient;

process.exit(0);
