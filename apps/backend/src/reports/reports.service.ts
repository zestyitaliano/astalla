import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import dayjs from 'dayjs';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async latest(propertyId: string) {
    return this.prisma.reportSnapshot.findFirst({
      where: { propertyId },
      orderBy: { weekStart: 'desc' },
    });
  }

  async create(propertyId: string, payload: Partial<{ occupancy: number; cpl: number; cpls: number; red: boolean; watch: boolean }>) {
    const weekStart = dayjs().startOf('week').toDate();
    return this.prisma.reportSnapshot.upsert({
      where: { propertyId_weekStart: { propertyId, weekStart } },
      update: {
        ...payload,
        json: payload,
      },
      create: {
        propertyId,
        weekStart,
        occupancy: payload.occupancy ?? 0,
        cpl: payload.cpl ?? 0,
        cpls: payload.cpls ?? 0,
        red: payload.red ?? false,
        watch: payload.watch ?? false,
        json: payload,
      },
    });
  }
}
