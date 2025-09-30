import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.org.upsert({
    where: { id: 'org-1' },
    update: {},
    create: { id: 'org-1', name: 'Astalla Residential' }
  });

  await prisma.org.upsert({
    where: { id: 'org-2' },
    update: {},
    create: { id: 'org-2', name: 'Astalla West' }
  });

  await prisma.property.upsert({
    where: { id: 'prop-1' },
    update: {},
    create: {
      id: 'prop-1',
      propertyCode: 'AST-100',
      name: 'Astalla Heights',
      region: 'Austin',
      unitCount: 210,
      orgId: 'org-1'
    }
  });

  await prisma.property.upsert({
    where: { id: 'prop-2' },
    update: {},
    create: {
      id: 'prop-2',
      propertyCode: 'AST-200',
      name: 'Astalla Commons',
      region: 'Dallas',
      unitCount: 165,
      orgId: 'org-1'
    }
  });

  await prisma.property.upsert({
    where: { id: 'prop-3' },
    update: {},
    create: {
      id: 'prop-3',
      propertyCode: 'AST-300',
      name: 'Astalla Landing',
      region: 'Phoenix',
      unitCount: 190,
      orgId: 'org-2'
    }
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete');
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
