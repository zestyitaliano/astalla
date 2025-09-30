import { Injectable } from '@nestjs/common';
import { KPI_KEYS, MetricTile, OrgSelector, Property, Review, WeeklyReport } from '@astalla/shared';

interface EventItem {
  type: string;
  at: string;
  description: string;
}

@Injectable()
export class DataService {
  private readonly properties: Property[] = [
    {
      id: 'prop-1',
      orgId: 'org-1',
      propertyCode: 'AST-100',
      name: 'Astalla Heights',
      region: 'Austin',
      unitCount: 210,
      createdAt: new Date().toISOString()
    },
    {
      id: 'prop-2',
      orgId: 'org-1',
      propertyCode: 'AST-200',
      name: 'Astalla Commons',
      region: 'Dallas',
      unitCount: 165,
      createdAt: new Date().toISOString()
    },
    {
      id: 'prop-3',
      orgId: 'org-2',
      propertyCode: 'AST-300',
      name: 'Astalla Landing',
      region: 'Phoenix',
      unitCount: 190,
      createdAt: new Date().toISOString()
    }
  ];

  private readonly orgs: OrgSelector[] = [
    {
      orgId: 'org-1',
      orgName: 'Astalla Residential',
      regions: [
        { region: 'Austin', properties: [this.properties[0]] },
        { region: 'Dallas', properties: [this.properties[1]] }
      ]
    },
    {
      orgId: 'org-2',
      orgName: 'Astalla West',
      regions: [{ region: 'Phoenix', properties: [this.properties[2]] }]
    }
  ];

  private readonly tiles: Record<string, MetricTile[]> = {
    'prop-1': [
      { key: KPI_KEYS.OCCUPANCY_CURRENT, label: 'Occupancy (Current)', value: 94, comparison: 92, unit: '%', status: 'OK' },
      { key: KPI_KEYS.OCCUPANCY_30, label: 'Occupancy (30d)', value: 91, comparison: 90, unit: '%', status: 'WATCH' },
      { key: KPI_KEYS.OCCUPANCY_60, label: 'Occupancy (60d)', value: 89, comparison: 88, unit: '%', status: 'WATCH' },
      { key: KPI_KEYS.PIPELINE_VELOCITY, label: 'Pipeline velocity', value: 4.3, comparison: 3.8, unit: 'days', status: 'OK' },
      { key: KPI_KEYS.CPL, label: 'Cost per Lead', value: 42, comparison: 45, unit: '$', status: 'OK' },
      { key: KPI_KEYS.CPLS, label: 'Cost per Lease', value: 255, comparison: 270, unit: '$', status: 'OK' },
      { key: KPI_KEYS.REVIEWS_POSITIVE, label: 'Positive reviews', value: 82, comparison: 78, unit: '%', status: 'OK' },
      { key: KPI_KEYS.RED_WATCH_STATUS, label: 'Status', value: 1, comparison: 0, status: 'WATCH' }
    ],
    'prop-2': [
      { key: KPI_KEYS.OCCUPANCY_CURRENT, label: 'Occupancy (Current)', value: 87, comparison: 90, unit: '%', status: 'RED' },
      { key: KPI_KEYS.OCCUPANCY_30, label: 'Occupancy (30d)', value: 85, comparison: 88, unit: '%', status: 'RED' },
      { key: KPI_KEYS.OCCUPANCY_60, label: 'Occupancy (60d)', value: 88, comparison: 89, unit: '%', status: 'WATCH' },
      { key: KPI_KEYS.PIPELINE_VELOCITY, label: 'Pipeline velocity', value: 5.1, comparison: 4.2, unit: 'days', status: 'WATCH' },
      { key: KPI_KEYS.CPL, label: 'Cost per Lead', value: 55, comparison: 52, unit: '$', status: 'WATCH' },
      { key: KPI_KEYS.CPLS, label: 'Cost per Lease', value: 310, comparison: 295, unit: '$', status: 'RED' },
      { key: KPI_KEYS.REVIEWS_POSITIVE, label: 'Positive reviews', value: 62, comparison: 65, unit: '%', status: 'WATCH' },
      { key: KPI_KEYS.RED_WATCH_STATUS, label: 'Status', value: 2, comparison: 2, status: 'RED' }
    ],
    'prop-3': [
      { key: KPI_KEYS.OCCUPANCY_CURRENT, label: 'Occupancy (Current)', value: 93, comparison: 92, unit: '%', status: 'OK' },
      { key: KPI_KEYS.OCCUPANCY_30, label: 'Occupancy (30d)', value: 94, comparison: 93, unit: '%', status: 'OK' },
      { key: KPI_KEYS.OCCUPANCY_60, label: 'Occupancy (60d)', value: 92, comparison: 91, unit: '%', status: 'OK' },
      { key: KPI_KEYS.PIPELINE_VELOCITY, label: 'Pipeline velocity', value: 3.9, comparison: 4.1, unit: 'days', status: 'OK' },
      { key: KPI_KEYS.CPL, label: 'Cost per Lead', value: 37, comparison: 39, unit: '$', status: 'OK' },
      { key: KPI_KEYS.CPLS, label: 'Cost per Lease', value: 230, comparison: 240, unit: '$', status: 'OK' },
      { key: KPI_KEYS.REVIEWS_POSITIVE, label: 'Positive reviews', value: 88, comparison: 83, unit: '%', status: 'OK' },
      { key: KPI_KEYS.RED_WATCH_STATUS, label: 'Status', value: 0, comparison: 1, status: 'OK' }
    ]
  };

  private readonly reviews: Record<string, Review[]> = {
    'prop-1': Array.from({ length: 10 }).map((_, i) => ({
      id: `review-${i}`,
      propertyId: 'prop-1',
      rating: i % 3 === 0 ? 3.7 : 4.8,
      text: i % 3 === 0 ? 'Maintenance took a bit longer than expected.' : 'Wonderful amenities and staff!',
      provider: 'GBP',
      at: new Date(Date.now() - i * 86400000).toISOString(),
      sentiment: i % 3 === 0 ? 'NEUTRAL' : 'POSITIVE'
    })),
    'prop-2': Array.from({ length: 10 }).map((_, i) => ({
      id: `review-2-${i}`,
      propertyId: 'prop-2',
      rating: i % 2 === 0 ? 2.5 : 4.1,
      text: i % 2 === 0 ? 'Noise levels can be high on weekends.' : 'Great location near downtown.',
      provider: 'GBP',
      at: new Date(Date.now() - i * 43200000).toISOString(),
      sentiment: i % 2 === 0 ? 'NEGATIVE' : 'NEUTRAL'
    })),
    'prop-3': Array.from({ length: 10 }).map((_, i) => ({
      id: `review-3-${i}`,
      propertyId: 'prop-3',
      rating: 4.9,
      text: 'Love this property – staff is amazing!',
      provider: 'GBP',
      at: new Date(Date.now() - i * 604800000).toISOString(),
      sentiment: 'POSITIVE'
    }))
  };

  private readonly reports: Record<string, WeeklyReport> = {
    'prop-1': {
      propertyId: 'prop-1',
      weekStart: new Date().toISOString(),
      occupancy: 94,
      cpl: 42,
      cpls: 255,
      red: false,
      watch: true,
      json: { highlights: ['Occupancy up 2pts', 'Lead response under SLA'] }
    },
    'prop-2': {
      propertyId: 'prop-2',
      weekStart: new Date().toISOString(),
      occupancy: 87,
      cpl: 55,
      cpls: 310,
      red: true,
      watch: false,
      json: { alerts: ['CPL trending high', 'Occupancy dropped 3pts'] }
    },
    'prop-3': {
      propertyId: 'prop-3',
      weekStart: new Date().toISOString(),
      occupancy: 93,
      cpl: 37,
      cpls: 230,
      red: false,
      watch: false,
      json: { notes: ['All KPIs green'] }
    }
  };

  private readonly events: Record<string, EventItem[]> = {
    'prop-1': [
      { type: 'Lead', at: new Date().toISOString(), description: 'Inbound lead from Google Ads' },
      { type: 'Tour', at: new Date(Date.now() - 3600000).toISOString(), description: 'Tour completed' },
      { type: 'Lease', at: new Date(Date.now() - 86400000).toISOString(), description: 'Lease signed for Unit 204' }
    ],
    'prop-2': [
      { type: 'Lead', at: new Date().toISOString(), description: 'New lead from Entrata' },
      { type: 'Application', at: new Date(Date.now() - 7200000).toISOString(), description: 'Application submitted' }
    ],
    'prop-3': [
      { type: 'Lead', at: new Date().toISOString(), description: 'Referral lead captured' }
    ]
  };

  getOrgScope(): OrgSelector[] {
    return this.orgs;
  }

  getTiles(propertyId: string): MetricTile[] {
    return this.tiles[propertyId] ?? [];
  }

  getReviews(propertyId: string): Review[] {
    return this.reviews[propertyId] ?? [];
  }

  getReport(propertyId: string): WeeklyReport | undefined {
    return this.reports[propertyId];
  }

  getProperty(propertyId: string): (Property & { occupancy: Record<string, number>; recentEvents: EventItem[]; reviews: Review[] }) | undefined {
    const property = this.properties.find((p) => p.id === propertyId);
    if (!property) return undefined;
    const tiles = this.getTiles(propertyId);
    return {
      ...property,
      occupancy: {
        current: tiles.find((tile) => tile.key === KPI_KEYS.OCCUPANCY_CURRENT)?.value ?? 0,
        '30_day': tiles.find((tile) => tile.key === KPI_KEYS.OCCUPANCY_30)?.value ?? 0,
        '60_day': tiles.find((tile) => tile.key === KPI_KEYS.OCCUPANCY_60)?.value ?? 0
      },
      recentEvents: this.events[propertyId] ?? [],
      reviews: this.getReviews(propertyId)
    };
  }

  listProperties(): Property[] {
    return this.properties;
  }
}
