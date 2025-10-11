import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const ADMIN_EMAIL = process.env.ADMIN_TEST_LOGIN_EMAIL?.toLowerCase() || "admin@astalla.com";
const ADMIN_PASSWORD = process.env.ADMIN_TEST_LOGIN_PASSWORD || "Astalla2025!";

const prisma = new PrismaClient();

async function main() {
  console.log(`[smoke-auth] checking admin credential for ${ADMIN_EMAIL}`);
  const user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (!user) {
    console.error("[smoke-auth] admin user was not found");
    process.exitCode = 1;
    return;
  }

  const isValid = await bcrypt.compare(ADMIN_PASSWORD, user.passwordHash);
  console.log(`[smoke-auth] passwordValid=${isValid}`);

  if (!isValid) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("[smoke-auth] unexpected error", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
