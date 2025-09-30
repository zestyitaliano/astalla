import { MetricTile, OrgSelector, Review, WeeklyReport, Property } from '@astalla/shared';

const properties = [
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

export const orgScope: OrgSelector[] = [
  {
    orgId: 'org-1',
    orgName: 'Astalla Residential',
    regions: [
      { region: 'Austin', properties: [properties[0]] },
      { region: 'Dallas', properties: [properties[1]] }
    ]
  },
  {
    orgId: 'org-2',
    orgName: 'Astalla West',
    regions: [{ region: 'Phoenix', properties: [properties[2]] }]
  }
];

export const tilesByProperty: Record<string, MetricTile[]> = {
  'prop-1': [
    { key: 'occupancy_current', label: 'Occupancy (Current)', value: 94, comparison: 92, unit: '%', status: 'OK' },
    { key: 'occupancy_30', label: 'Occupancy (30d)', value: 91, comparison: 90, unit: '%', status: 'WATCH' },
    { key: 'occupancy_60', label: 'Occupancy (60d)', value: 89, comparison: 88, unit: '%', status: 'WATCH' },
    { key: 'pipeline_velocity', label: 'Pipeline velocity', value: 4.3, comparison: 3.8, unit: 'days', status: 'OK' },
    { key: 'cpl', label: 'Cost per Lead', value: 42, comparison: 45, unit: '$', status: 'OK' },
    { key: 'cpls', label: 'Cost per Lease', value: 255, comparison: 270, unit: '$', status: 'OK' }
  ],
  'prop-2': [
    { key: 'occupancy_current', label: 'Occupancy (Current)', value: 87, comparison: 90, unit: '%', status: 'RED' },
    { key: 'occupancy_30', label: 'Occupancy (30d)', value: 85, comparison: 88, unit: '%', status: 'RED' },
    { key: 'occupancy_60', label: 'Occupancy (60d)', value: 88, comparison: 89, unit: '%', status: 'WATCH' },
    { key: 'pipeline_velocity', label: 'Pipeline velocity', value: 5.1, comparison: 4.2, unit: 'days', status: 'WATCH' },
    { key: 'cpl', label: 'Cost per Lead', value: 55, comparison: 52, unit: '$', status: 'WATCH' },
    { key: 'cpls', label: 'Cost per Lease', value: 310, comparison: 295, unit: '$', status: 'RED' }
  ],
  'prop-3': [
    { key: 'occupancy_current', label: 'Occupancy (Current)', value: 93, comparison: 92, unit: '%', status: 'OK' },
    { key: 'occupancy_30', label: 'Occupancy (30d)', value: 94, comparison: 93, unit: '%', status: 'OK' },
    { key: 'occupancy_60', label: 'Occupancy (60d)', value: 92, comparison: 91, unit: '%', status: 'OK' },
    { key: 'pipeline_velocity', label: 'Pipeline velocity', value: 3.9, comparison: 4.1, unit: 'days', status: 'OK' },
    { key: 'cpl', label: 'Cost per Lead', value: 37, comparison: 39, unit: '$', status: 'OK' },
    { key: 'cpls', label: 'Cost per Lease', value: 230, comparison: 240, unit: '$', status: 'OK' }
  ]
};

const baseReviews: Review[] = Array.from({ length: 10 }).map((_, index) => ({
  id: `review-${index}`,
  propertyId: 'prop-1',
  rating: index % 3 === 0 ? 3.5 : 4.6,
  text: index % 3 === 0 ? 'Staff was helpful but wait times were long.' : 'Absolutely love living here – maintenance is responsive!',
  provider: 'GBP',
  at: new Date(Date.now() - index * 86400000).toISOString(),
  sentiment: index % 3 === 0 ? 'NEUTRAL' : 'POSITIVE'
}));

export const reviewsByProperty: Record<string, Review[]> = {
  'prop-1': baseReviews,
  'prop-2': baseReviews.map((review, idx) => ({ ...review, id: `review-2-${idx}`, propertyId: 'prop-2', sentiment: idx % 2 === 0 ? 'NEGATIVE' : 'NEUTRAL' })),
  'prop-3': baseReviews.map((review, idx) => ({ ...review, id: `review-3-${idx}`, propertyId: 'prop-3', sentiment: 'POSITIVE' }))
};

export const reportsByProperty: Record<string, WeeklyReport> = {
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

export function propertyDetail(propertyId: string): (Property & { occupancy: Record<string, number>; recentEvents: { type: string; at: string; description: string }[]; reviews: Review[] }) | null {
  const property = properties.find((p) => p.id === propertyId);
  if (!property) return null;
  return {
    ...property,
    occupancy: {
      current: tilesByProperty[propertyId]?.[0]?.value ?? 0,
      '30_day': tilesByProperty[propertyId]?.[1]?.value ?? 0,
      '60_day': tilesByProperty[propertyId]?.[2]?.value ?? 0
    },
    recentEvents: [
      { type: 'Lead', at: new Date().toISOString(), description: 'New lead captured from Google Ads.' },
      { type: 'Tour', at: new Date(Date.now() - 3600 * 1000).toISOString(), description: 'Tour completed with strong interest.' },
      { type: 'Lease', at: new Date(Date.now() - 86400000).toISOString(), description: 'Lease signed for Unit 204.' }
    ],
    reviews: reviewsByProperty[propertyId] ?? []
  };
}
