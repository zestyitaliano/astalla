import { Injectable } from '@nestjs/common';
import { DataService } from '../../common/data.service';

export interface OccupancyInput {
  occupiedLeases: number;
  preLeasesStartingWithinWindow: number;
  rentableUnits: number;
}

export interface AnticipatedOccupancyInput extends OccupancyInput {
  moveOutsWithinWindow: number;
}

@Injectable()
export class MetricsService {
  constructor(private readonly dataService: DataService) {}

  calculateCurrentOccupancy({ occupiedLeases, preLeasesStartingWithinWindow, rentableUnits }: OccupancyInput): number {
    if (rentableUnits <= 0) {
      return 0;
    }
    const occupied = occupiedLeases + preLeasesStartingWithinWindow;
    const ratio = (occupied / rentableUnits) * 100;
    return Math.min(100, Math.max(0, Math.round(ratio)));
  }

  calculateAnticipatedOccupancy(
    current: number,
    { occupiedLeases, preLeasesStartingWithinWindow, rentableUnits, moveOutsWithinWindow }: AnticipatedOccupancyInput
  ): number {
    if (rentableUnits <= 0) {
      return 0;
    }
    const base = occupiedLeases + preLeasesStartingWithinWindow - moveOutsWithinWindow;
    const ratio = (base / rentableUnits) * 100;
    const weighted = Math.round((current + ratio) / 2);
    return Math.min(100, Math.max(0, weighted));
  }

  isLeadNeglected(lastInboundAt: Date, lastOutboundAt: Date | null, slaHours: number): boolean {
    const slaMs = slaHours * 3600000;
    const lastOutbound = lastOutboundAt?.getTime() ?? 0;
    const inbound = lastInboundAt.getTime();
    if (!lastOutboundAt) {
      return Date.now() - inbound > slaMs;
    }
    return lastOutbound - inbound > slaMs;
  }

  tiles(propertyId: string) {
    return this.dataService.getTiles(propertyId);
  }

  occupancy(propertyId: string) {
    const tiles = this.tiles(propertyId);
    const map = new Map(tiles.map((tile) => [tile.key, tile.value]));
    return {
      current: map.get('occupancy_current') ?? 0,
      days30: map.get('occupancy_30') ?? 0,
      days60: map.get('occupancy_60') ?? 0
    };
  }

  pipeline(propertyId: string) {
    return {
      propertyId,
      velocityDays: 4.2,
      inboundLeads: 54,
      toursScheduled: 28,
      leasesSigned: 12,
      neglectedLeads: 3
    };
  }

  cost(propertyId: string) {
    return {
      propertyId,
      spend: {
        googleAds: 4200,
        meta: 1200,
        total: 5400
      },
      costPerLead: 42,
      costPerLease: 255
    };
  }
}
