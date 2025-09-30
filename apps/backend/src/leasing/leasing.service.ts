import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import dayjs from 'dayjs';

interface OccupancyResult {
  current: number;
  anticipated: number;
  occupiedUnits: number;
  totalUnits: number;
}

@Injectable()
export class LeasingService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateOccupancy(propertyId: string, window: number): Promise<OccupancyResult> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { unitCount: true },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    const now = dayjs();
    const windowEnd = now.add(window, 'day');

    const [active, preleases, moveOuts] = await Promise.all([
      this.prisma.lease.count({
        where: {
          propertyId,
          status: 'ACTIVE',
          startDate: { lte: now.toDate() },
          endDate: { gte: now.toDate() },
        },
      }),
      this.prisma.lease.count({
        where: {
          propertyId,
          status: { in: ['PENDING', 'ACTIVE'] },
          startDate: { gt: now.toDate(), lte: windowEnd.toDate() },
        },
      }),
      this.prisma.lease.count({
        where: {
          propertyId,
          status: { in: ['NOTICE_GIVEN', 'TERMINATED'] },
          endDate: { gte: now.toDate(), lte: windowEnd.toDate() },
        },
      }),
    ]);

    const current = property.unitCount === 0 ? 0 : active / property.unitCount;
    const anticipatedUnits = active + preleases - moveOuts;
    const anticipated = property.unitCount === 0 ? 0 : anticipatedUnits / property.unitCount;

    return {
      current,
      anticipated,
      occupiedUnits: active,
      totalUnits: property.unitCount,
    };
  }

  async findNeglectedLeads(propertyId: string, slaHours: number) {
    const leads = await this.prisma.lead.findMany({
      where: { propertyId },
      include: {
        events: {
          orderBy: { at: 'desc' },
        },
      },
    });

    const threshold = dayjs().subtract(slaHours, 'hour');
    return leads
      .filter((lead) => {
        const inbound = lead.events.find((event) => event.type === 'INBOUND');
        if (!inbound) {
          return false;
        }
        const outbound = lead.events.find((event) => event.type === 'OUTBOUND' && dayjs(event.at).isAfter(inbound.at));
        if (!outbound) {
          return dayjs(inbound.at).isBefore(threshold);
        }
        return dayjs(outbound.at).diff(inbound.at, 'hour') > slaHours;
      })
      .map((lead) => ({
        leadId: lead.id,
        externalId: lead.externalId,
        lastInboundAt: lead.events.find((event) => event.type === 'INBOUND')?.at,
        lastOutboundAt: lead.events.find((event) => event.type === 'OUTBOUND')?.at,
      }));
  }
}
