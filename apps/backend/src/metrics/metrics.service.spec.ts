import dayjs from 'dayjs';
import { MetricsService } from './metrics.service';
import { LeasingService } from '../leasing/leasing.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MetricsService', () => {
  const prisma = {
    lead: { count: jest.fn() },
    leadEvent: { count: jest.fn() },
    application: { count: jest.fn() },
    channelSpend: { findMany: jest.fn() },
    conversionEvent: { findMany: jest.fn() },
  } satisfies {
    lead: { count: jest.Mock };
    leadEvent: { count: jest.Mock };
    application: { count: jest.Mock };
    channelSpend: { findMany: jest.Mock };
    conversionEvent: { findMany: jest.Mock };
  };

  const leasing = {
    calculateOccupancy: jest.fn<Promise<{ current: number; anticipated: number; occupiedUnits: number; totalUnits: number }>, [string, number]>(),
  };

  const service = new MetricsService(prisma as unknown as PrismaService, leasing as unknown as LeasingService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns occupancy response', async () => {
    leasing.calculateOccupancy.mockResolvedValue({ current: 0.9, anticipated: 0.95, occupiedUnits: 90, totalUnits: 100 });
    const result = await service.occupancy('prop', 30);
    expect(result.current).toBeCloseTo(0.9);
    expect(result.totalUnits).toBe(100);
  });

  it('returns pipeline metrics', async () => {
    prisma.lead.count.mockResolvedValueOnce(50);
    prisma.leadEvent.count.mockResolvedValueOnce(20);
    prisma.application.count.mockResolvedValueOnce(15);
    prisma.application.count.mockResolvedValueOnce(10);
    const pipeline = await service.pipeline('prop');
    expect(pipeline).toEqual({ leads: 50, tours: 20, applications: 15, approvals: 10 });
  });

  it('returns cost metrics', async () => {
    prisma.channelSpend.findMany.mockResolvedValue([
      { cost: 100, day: dayjs().toDate() },
      { cost: 50, day: dayjs().toDate() },
    ]);
    prisma.conversionEvent.findMany.mockResolvedValue([
      { count: 10, day: dayjs().toDate() },
      { count: 5, day: dayjs().toDate() },
    ]);
    const cost = await service.cost('prop');
    expect(cost.totalSpend).toBe(150);
    expect(cost.totalConversions).toBe(15);
    expect(cost.costPerLead).toBeCloseTo(10);
  });
});
