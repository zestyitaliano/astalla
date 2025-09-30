import { MetricsService } from './metrics.service';
import { DataService } from '../../common/data.service';

describe('MetricsService', () => {
  const service = new MetricsService(new DataService());

  it('calculates current occupancy with bounds', () => {
    const result = service.calculateCurrentOccupancy({ occupiedLeases: 95, preLeasesStartingWithinWindow: 10, rentableUnits: 100 });
    expect(result).toBe(100);

    const zero = service.calculateCurrentOccupancy({ occupiedLeases: 0, preLeasesStartingWithinWindow: 0, rentableUnits: 0 });
    expect(zero).toBe(0);
  });

  it('calculates anticipated occupancy smoothing results', () => {
    const current = service.calculateCurrentOccupancy({ occupiedLeases: 90, preLeasesStartingWithinWindow: 5, rentableUnits: 100 });
    const anticipated = service.calculateAnticipatedOccupancy(current, {
      occupiedLeases: 90,
      preLeasesStartingWithinWindow: 5,
      moveOutsWithinWindow: 10,
      rentableUnits: 100
    });
    expect(anticipated).toBeGreaterThan(0);
    expect(anticipated).toBeLessThanOrEqual(100);
  });

  it('determines neglected lead beyond SLA', () => {
    const inbound = new Date(Date.now() - 5 * 3600000);
    const neglected = service.isLeadNeglected(inbound, null, 3);
    expect(neglected).toBe(true);

    const outbound = new Date(Date.now() - 2 * 3600000);
    const ok = service.isLeadNeglected(inbound, outbound, 6);
    expect(ok).toBe(false);
  });
});
