import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

async function main() {
  const properties = await prisma.property.findMany();
  const weekStart = dayjs().startOf('week').toDate();

  for (const property of properties) {
    const occupancy = await prisma.lease.count({
      where: {
        propertyId: property.id,
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    const apps = await prisma.application.count({
      where: {
        lead: { propertyId: property.id },
        status: 'APPROVED',
        approvedAt: { gte: dayjs(weekStart).toDate() },
      },
    });

    await prisma.reportSnapshot.upsert({
      where: { propertyId_weekStart: { propertyId: property.id, weekStart } },
      update: {
        occupancy,
        cpl: 120,
        cpls: 300,
        red: occupancy / property.unitCount < 0.85,
        watch: apps < 3,
        json: {
          approvedApplications: apps,
        },
      },
      create: {
        propertyId: property.id,
        weekStart,
        occupancy,
        cpl: 120,
        cpls: 300,
        red: occupancy / property.unitCount < 0.85,
        watch: apps < 3,
        json: {
          approvedApplications: apps,
        },
      },
    });
  }

  console.log('Weekly snapshots refreshed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
