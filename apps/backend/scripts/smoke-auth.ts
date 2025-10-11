import { existsSync } from "node:fs";
import path from "node:path";

import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

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

loadTestEnvironment();

const ADMIN_EMAIL = (process.env.ADMIN_TEST_LOGIN_EMAIL || "admin@astalla.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_TEST_LOGIN_PASSWORD || "Astalla2025!";

const prisma = new PrismaClient();

async function main() {
  console.log(`[smoke-auth] checking seeded admin credential for ${ADMIN_EMAIL}`);
  const user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (!user) {
    console.error("[smoke-auth] FAIL admin user was not found");
    process.exitCode = 1;
    return;
  }

  const isValid = await bcrypt.compare(ADMIN_PASSWORD, user.passwordHash);

  if (!isValid) {
    console.error("[smoke-auth] FAIL password hash mismatch for seeded admin user");
    process.exitCode = 1;
    return;
  }

  console.log("[smoke-auth] OK admin credentials verified");
}

main()
  .catch((error) => {
    console.error("[smoke-auth] unexpected error", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
