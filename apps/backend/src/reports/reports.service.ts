import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { PrismaService } from '../prisma/prisma.service';

export interface ReportUpsertPayload {
  occupancy?: number;
  cpl?: number;
  cpls?: number;
  red?: boolean;
  watch?: boolean;
  summary?: unknown;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async latest(propertyId: string) {
    return this.prisma.reportSnapshot.findFirst({
      where: { propertyId },
      orderBy: { weekStart: 'desc' },
    });
  }

  async create(propertyId: string, payload: ReportUpsertPayload) {
    const weekStart = dayjs().startOf('week').toDate();
    const { summary, ...metrics } = payload;
    const jsonPayload = summary ?? metrics;
    return this.prisma.reportSnapshot.upsert({
      where: { propertyId_weekStart: { propertyId, weekStart } },
      update: {
        ...metrics,
        json: jsonPayload,
      },
      create: {
        propertyId,
        weekStart,
        occupancy: metrics.occupancy ?? 0,
        cpl: metrics.cpl ?? 0,
        cpls: metrics.cpls ?? 0,
        red: metrics.red ?? false,
        watch: metrics.watch ?? false,
        json: jsonPayload,
      },
    });
  }
}
