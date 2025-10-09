import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@astalla.com";
const ADMIN_PASSWORD = "Astalla2025!";

async function main() {
  const email = ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const bcryptRounds = bcrypt.getRounds(passwordHash);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: UserRole.ORG_ADMIN
    },
    update: {
      passwordHash,
      role: UserRole.ORG_ADMIN
    }
  });

  const isPasswordValid = await bcrypt.compare(ADMIN_PASSWORD, user.passwordHash);

  console.log(
    `Seeded admin user: ${user.email} (${existing ? "updated" : "created"}). bcryptRounds=${bcryptRounds}. passwordValid=${isPasswordValid}`
  );
}

main()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
