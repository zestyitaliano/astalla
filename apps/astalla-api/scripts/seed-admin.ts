import bcrypt from 'bcryptjs';
import { prisma } from '../src/services/prisma';

async function main() {
  const email = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@astalla.com';
  const password = process.env.DEFAULT_ADMIN_PASSWORD ?? 'Astalla2025!';

  const hash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        name: 'Admin',
        role: 'admin',
        passwordHash: hash,
      },
    });
    console.log('Seeded default admin:', email);
  } else {
    console.log('Admin already exists:', email);
  }
}

main()
  .catch((error) => {
    console.error('Failed to seed admin user:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
