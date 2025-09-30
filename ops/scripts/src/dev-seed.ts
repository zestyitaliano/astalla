import { PrismaClient, LeadEventType, ApplicationStatus, LeaseStatus, Role } from '@prisma/client';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.org.upsert({
    where: { id: 'org_demo' },
    update: {},
    create: {
      id: 'org_demo',
      name: 'Astalla Demo Org',
    },
  });

  const properties = await Promise.all(
    ['AST-NORTH', 'AST-CENTRAL', 'AST-SOUTH'].map((code, idx) =>
      prisma.property.upsert({
        where: { propertyCode: code },
        update: {},
        create: {
          id: `prop_${idx}`,
          orgId: org.id,
          propertyCode: code,
          name: `Astalla ${code.split('-')[1] ?? idx}`,
          region: idx === 0 ? 'North' : idx === 1 ? 'Central' : 'South',
          unitCount: idx === 0 ? 120 : idx === 1 ? 95 : 140,
        },
      }),
    ),
  );

  await prisma.user.upsert({
    where: { email: 'admin@astalla.com' },
    update: {},
    create: {
      id: 'user_admin',
      email: 'admin@astalla.com',
      name: 'Org Admin',
    },
  });

  await prisma.userOrgRole.upsert({
    where: { id: 'role_admin' },
    update: {},
    create: {
      id: 'role_admin',
      orgId: org.id,
      userId: 'user_admin',
      role: Role.ORG_ADMIN,
    },
  });

  const today = dayjs();

  for (const property of properties) {
    for (let i = 0; i < 10; i++) {
      const lead = await prisma.lead.create({
        data: {
          propertyId: property.id,
          externalId: `${property.propertyCode}-LEAD-${i}`,
          source: i % 2 === 0 ? 'Google Ads' : 'Entrata',
          createdAt: today.subtract(i, 'day').toDate(),
        },
      });

      await prisma.leadEvent.createMany({
        data: [
          {
            leadId: lead.id,
            type: LeadEventType.INBOUND,
            at: today.subtract(i, 'day').toDate(),
            meta: { channel: lead.source },
          },
          {
            leadId: lead.id,
            type: LeadEventType.OUTBOUND,
            at: today.subtract(i, 'day').add(2, 'hour').toDate(),
            meta: { medium: 'email' },
          },
        ],
      });

      if (i % 3 === 0) {
        await prisma.application.create({
          data: {
            leadId: lead.id,
            status: ApplicationStatus.APPROVED,
            submittedAt: today.subtract(i - 1, 'day').toDate(),
            approvedAt: today.subtract(i - 1, 'day').add(1, 'day').toDate(),
          },
        });

        await prisma.lease.create({
          data: {
            leadId: lead.id,
            propertyId: property.id,
            startDate: today.add(5, 'day').toDate(),
            endDate: today.add(370, 'day').toDate(),
            status: LeaseStatus.ACTIVE,
          },
        });
      }
    }

    await prisma.channelSpend.createMany({
      data: Array.from({ length: 7 }).map((_, idx) => ({
        propertyId: property.id,
        day: today.subtract(idx, 'day').startOf('day').toDate(),
        channel: 'GOOGLE_ADS',
        campaignId: `${property.propertyCode}-CAMP`,
        cost: 150 + idx * 10,
      })),
    });

    await prisma.conversionEvent.createMany({
      data: Array.from({ length: 7 }).map((_, idx) => ({
        propertyId: property.id,
        day: today.subtract(idx, 'day').startOf('day').toDate(),
        type: 'APPLICATION_SUBMITTED',
        count: 3 + idx,
      })),
    });

    await prisma.review.createMany({
      data: Array.from({ length: 10 }).map((_, idx) => ({
        propertyId: property.id,
        provider: 'GBP',
        rating: (idx % 5) + 1,
        text: `Review ${idx} for ${property.name}`,
        at: today.subtract(idx, 'day').toDate(),
      })),
    });

    await prisma.sentimentSummary.upsert({
      where: { propertyId_weekStart: { propertyId: property.id, weekStart: today.startOf('week').toDate() } },
      update: { posPct: 0.74, negPct: 0.12, topics: { highlights: ['Staff', 'Amenities'] } },
      create: {
        propertyId: property.id,
        weekStart: today.startOf('week').toDate(),
        posPct: 0.74,
        negPct: 0.12,
        topics: { highlights: ['Staff', 'Amenities'] },
      },
    });

    await prisma.kPIThreshold.upsert({
      where: { propertyId_kpi: { propertyId: property.id, kpi: 'OCCUPANCY' } },
      update: { target: 0.92, warnBelow: 0.88 },
      create: { propertyId: property.id, kpi: 'OCCUPANCY', target: 0.92, warnBelow: 0.88 },
    });
  }

  console.log('Seeded demo data');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
