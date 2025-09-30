import { Injectable } from '@nestjs/common';
import { ChannelSpend, ConversionEvent } from '@prisma/client';
import dayjs from 'dayjs';
import { LeasingService } from '../leasing/leasing.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService, private readonly leasingService: LeasingService) {}

  async occupancy(propertyId: string, window = 30) {
    const result = await this.leasingService.calculateOccupancy(propertyId, window);
    return {
      current: Number(result.current.toFixed(4)),
      anticipated: Number(result.anticipated.toFixed(4)),
      occupiedUnits: result.occupiedUnits,
      totalUnits: result.totalUnits,
    };
  }

  async pipeline(propertyId: string) {
    const since = dayjs().subtract(30, 'day').toDate();
    const [leads, tours, applications, approvals] = await Promise.all([
      this.prisma.lead.count({ where: { propertyId, createdAt: { gte: since } } }),
      this.prisma.leadEvent.count({
        where: { lead: { propertyId }, type: 'TOUR_COMPLETED', at: { gte: since } },
      }),
      this.prisma.application.count({ where: { lead: { propertyId }, createdAt: { gte: since } } }),
      this.prisma.application.count({
        where: { lead: { propertyId }, status: 'APPROVED', approvedAt: { gte: since } },
      }),
    ]);

    return {
      leads,
      tours,
      applications,
      approvals,
    };
  }

  async cost(propertyId: string) {
    const since = dayjs().subtract(30, 'day').startOf('day').toDate();
    const spend = (await this.prisma.channelSpend.findMany({
      where: { propertyId, day: { gte: since } },
    })) as ChannelSpend[];
    const conversions = (await this.prisma.conversionEvent.findMany({
      where: { propertyId, day: { gte: since } },
    })) as ConversionEvent[];

    const totalSpend = spend.reduce<number>((acc, item) => acc + item.cost, 0);
    const totalConversions = conversions.reduce<number>((acc, item) => acc + item.count, 0);
    const costPerLead = totalConversions === 0 ? null : totalSpend / totalConversions;

    return {
      totalSpend,
      totalConversions,
      costPerLead,
    };
  }
}
