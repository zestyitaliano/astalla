import dayjs from 'dayjs';
import { LeasingService } from './leasing.service';

describe('LeasingService', () => {
  const prisma = {
    property: { findUnique: jest.fn() },
    lease: { count: jest.fn() },
    lead: { findMany: jest.fn() },
  } as any;

  const service = new LeasingService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates occupancy ratios', async () => {
    prisma.property.findUnique.mockResolvedValue({ unitCount: 100 });
    prisma.lease.count
      .mockResolvedValueOnce(90) // active
      .mockResolvedValueOnce(5) // preleases
      .mockResolvedValueOnce(2); // move outs

    const result = await service.calculateOccupancy('prop', 30);
    expect(result.current).toBeCloseTo(0.9);
    expect(result.anticipated).toBeCloseTo((90 + 5 - 2) / 100);
    expect(result.occupiedUnits).toBe(90);
  });

  it('returns neglected leads based on SLA hours', async () => {
    const now = dayjs();
    prisma.lead.findMany.mockResolvedValue([
      {
        id: 'lead1',
        externalId: 'EXT1',
        events: [
          { type: 'INBOUND', at: now.subtract(10, 'hour').toDate() },
          { type: 'OUTBOUND', at: now.subtract(1, 'hour').toDate() },
        ],
      },
      {
        id: 'lead2',
        externalId: 'EXT2',
        events: [{ type: 'INBOUND', at: now.subtract(12, 'hour').toDate() }],
      },
    ]);

    const neglected = await service.findNeglectedLeads('prop', 6);
    expect(neglected).toHaveLength(1);
    expect(neglected[0].externalId).toBe('EXT2');
  });
});
