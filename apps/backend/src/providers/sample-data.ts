import type {
  Alert,
  CostMetricsResponse,
  LatestReviewsResponse,
  OccupancyMetricsResponse,
  PipelineMetricsResponse,
  PropertiesResponse
} from "@shared/api";

const now = Date.now();

function generateTrend(base: number, windowDays: number, variance = 0.04) {
  const points: OccupancyMetricsResponse["trend"] = [];
  for (let index = windowDays - 1; index >= 0; index -= 1) {
    const timestamp = new Date(now - index * 24 * 60 * 60 * 1000);
    const offset = Math.sin((index / windowDays) * Math.PI * 2) * variance;
    points.push({
      timestamp: timestamp.toISOString(),
      value: Number((base + base * offset).toFixed(4))
    });
  }
  return points;
}

function generateNumericTrend(base: number, windowDays: number, variance = 0.12) {
  const points: PipelineMetricsResponse["trend"] = [];
  for (let index = windowDays - 1; index >= 0; index -= 1) {
    const timestamp = new Date(now - index * 24 * 60 * 60 * 1000);
    const offset = Math.cos((index / windowDays) * Math.PI) * variance;
    points.push({
      timestamp: timestamp.toISOString(),
      value: Math.max(0, Math.round(base + base * offset))
    });
  }
  return points;
}

type PropertyConfig = {
  id: string;
  name: string;
  city: string;
  state: string;
  totalUnits: number;
  occupancy: Record<7 | 30 | 90, { rate: number; change: number }>;
  pipeline: Record<7 | 30 | 90, { leads: number; tours: number; started: number; approved: number }>;
  cost: Record<7 | 30 | 90, { cpl: number; spend: number; change: number }>;
  reviews: LatestReviewsResponse;
  alerts: Alert[];
};

const properties: PropertyConfig[] = [
  {
    id: "prop-atrium",
    name: "Atrium Center",
    city: "Austin",
    state: "TX",
    totalUnits: 360,
    occupancy: {
      7: { rate: 0.94, change: 0.012 },
      30: { rate: 0.932, change: 0.018 },
      90: { rate: 0.918, change: 0.024 }
    },
    pipeline: {
      7: { leads: 68, tours: 28, started: 18, approved: 12 },
      30: { leads: 240, tours: 98, started: 72, approved: 44 },
      90: { leads: 670, tours: 268, started: 202, approved: 134 }
    },
    cost: {
      7: { cpl: 122.5, spend: 8400, change: -0.05 },
      30: { cpl: 128.4, spend: 27800, change: -0.08 },
      90: { cpl: 131.2, spend: 78250, change: -0.11 }
    },
    reviews: {
      summary: {
        averageRating: 4.4,
        reviewCount: 128,
        responseRate: 0.86
      },
      recent: [
        {
          id: "rev-atrium-1",
          author: "Alex Johnson",
          rating: 5,
          body: "Maintenance requests were resolved in less than 24 hours. Appreciate the quick turnaround!",
          submittedAt: new Date(now - 1000 * 60 * 60 * 6).toISOString()
        },
        {
          id: "rev-atrium-2",
          author: "Taylor Smith",
          rating: 4,
          body: "Love the co-working lounge update. Parking could still be better organized though.",
          submittedAt: new Date(now - 1000 * 60 * 60 * 24).toISOString()
        }
      ]
    },
    alerts: [
      {
        id: "alert-atrium-lease",
        label: "Lease renewals",
        detail: "14 leases expiring within 45 days. Prep incentive options for high-value tenants.",
        severity: "medium",
        occurredAt: new Date(now - 1000 * 60 * 30).toISOString()
      },
      {
        id: "alert-atrium-review",
        label: "Resident feedback spike",
        detail: "Three new reviews mention elevator wait times during peak hours.",
        severity: "low",
        occurredAt: new Date(now - 1000 * 60 * 60 * 4).toISOString()
      }
    ]
  },
  {
    id: "prop-harbor",
    name: "Harbor Tower",
    city: "Seattle",
    state: "WA",
    totalUnits: 420,
    occupancy: {
      7: { rate: 0.888, change: -0.006 },
      30: { rate: 0.901, change: -0.012 },
      90: { rate: 0.914, change: -0.02 }
    },
    pipeline: {
      7: { leads: 52, tours: 26, started: 16, approved: 9 },
      30: { leads: 182, tours: 88, started: 60, approved: 34 },
      90: { leads: 520, tours: 245, started: 178, approved: 110 }
    },
    cost: {
      7: { cpl: 146.2, spend: 9200, change: 0.06 },
      30: { cpl: 152.8, spend: 31400, change: 0.08 },
      90: { cpl: 158.4, spend: 90500, change: 0.1 }
    },
    reviews: {
      summary: {
        averageRating: 4.1,
        reviewCount: 96,
        responseRate: 0.74
      },
      recent: [
        {
          id: "rev-harbor-1",
          author: "Morgan Lee",
          rating: 3,
          body: "Great view but lobby renovation noise is rough. Team has been responsive though.",
          submittedAt: new Date(now - 1000 * 60 * 60 * 8).toISOString()
        },
        {
          id: "rev-harbor-2",
          author: "Jordan Reyes",
          rating: 5,
          body: "Leasing team made the application process seamless. Excited to move in!",
          submittedAt: new Date(now - 1000 * 60 * 60 * 30).toISOString()
        }
      ]
    },
    alerts: [
      {
        id: "alert-harbor-maint",
        label: "Maintenance backlog",
        detail: "Eight open maintenance tickets exceed SLA. Coordinate contractor availability for HVAC units.",
        severity: "high",
        occurredAt: new Date(now - 1000 * 60 * 60 * 2).toISOString()
      },
      {
        id: "alert-harbor-marketing",
        label: "Marketing spend spike",
        detail: "Paid social spend is up 18% WoW with flat lead growth. Review campaign optimizations.",
        severity: "medium",
        occurredAt: new Date(now - 1000 * 60 * 60 * 14).toISOString()
      }
    ]
  },
  {
    id: "prop-quartz",
    name: "Quartz Labs",
    city: "Chicago",
    state: "IL",
    totalUnits: 310,
    occupancy: {
      7: { rate: 0.864, change: 0.02 },
      30: { rate: 0.842, change: 0.014 },
      90: { rate: 0.826, change: 0.008 }
    },
    pipeline: {
      7: { leads: 46, tours: 19, started: 12, approved: 7 },
      30: { leads: 158, tours: 64, started: 44, approved: 26 },
      90: { leads: 420, tours: 170, started: 118, approved: 70 }
    },
    cost: {
      7: { cpl: 118.1, spend: 6800, change: -0.12 },
      30: { cpl: 121.6, spend: 22900, change: -0.16 },
      90: { cpl: 126.2, spend: 66000, change: -0.2 }
    },
    reviews: {
      summary: {
        averageRating: 4.6,
        reviewCount: 142,
        responseRate: 0.9
      },
      recent: [
        {
          id: "rev-quartz-1",
          author: "Priya Patel",
          rating: 5,
          body: "Community events have been a huge hit—resident retention seems to be improving!",
          submittedAt: new Date(now - 1000 * 60 * 60 * 5).toISOString()
        },
        {
          id: "rev-quartz-2",
          author: "Jamie Fox",
          rating: 4,
          body: "Appreciate the new security measures. Would love more EV charging spots though.",
          submittedAt: new Date(now - 1000 * 60 * 60 * 18).toISOString()
        }
      ]
    },
    alerts: [
      {
        id: "alert-quartz-tour",
        label: "Tour-to-lease velocity",
        detail: "Tours converting to leases in 5.4 days (target 7). Highlight this win in weekly ops update.",
        severity: "low",
        occurredAt: new Date(now - 1000 * 60 * 45).toISOString()
      },
      {
        id: "alert-quartz-utility",
        label: "Utility variance",
        detail: "Energy spend trending 9% below forecast due to LED retrofit. Confirm savings allocation.",
        severity: "medium",
        occurredAt: new Date(now - 1000 * 60 * 60 * 10).toISOString()
      }
    ]
  }
];

function resolveWindow(value?: string) {
  const parsed = Number(value);
  if (parsed === 7 || parsed === 30 || parsed === 90) {
    return parsed;
  }
  return 30;
}

function resolveProperty(propertyId?: string) {
  return properties.find((property) => property.id === propertyId) ?? properties[0];
}

export function getProperties(): PropertiesResponse {
  return {
    properties: properties.map(({ id, name, city, state }) => ({
      id,
      name,
      city,
      state
    }))
  };
}

export function getOccupancy(propertyId?: string, windowParam?: string): OccupancyMetricsResponse {
  const property = resolveProperty(propertyId);
  const windowDays = resolveWindow(windowParam);
  const data = property.occupancy[windowDays];
  const unitsOccupied = Math.round(property.totalUnits * data.rate);

  return {
    occupancyRate: Number(data.rate.toFixed(3)),
    change: Number(data.change.toFixed(3)),
    unitsOccupied,
    totalUnits: property.totalUnits,
    trend: generateTrend(data.rate, windowDays)
  };
}

export function getPipeline(propertyId?: string, windowParam?: string): PipelineMetricsResponse {
  const property = resolveProperty(propertyId);
  const windowDays = resolveWindow(windowParam);
  const data = property.pipeline[windowDays];

  return {
    newLeads: data.leads,
    toursScheduled: data.tours,
    applicationsStarted: data.started,
    applicationsApproved: data.approved,
    trend: generateNumericTrend(Math.max(8, Math.round(data.leads / Math.max(1, windowDays / 7))), windowDays)
  };
}

export function getCost(propertyId?: string, windowParam?: string): CostMetricsResponse {
  const property = resolveProperty(propertyId);
  const windowDays = resolveWindow(windowParam);
  const data = property.cost[windowDays];

  return {
    costPerLead: Number(data.cpl.toFixed(2)),
    marketingSpend: data.spend,
    spendChange: Number(data.change.toFixed(3)),
    trend: generateNumericTrend(Math.round(data.cpl), windowDays, 0.08)
  };
}

export function getReviews(propertyId?: string): LatestReviewsResponse {
  const property = resolveProperty(propertyId);
  return property.reviews;
}

export function getAlerts(propertyId?: string): { alerts: Alert[] } {
  const property = resolveProperty(propertyId);
  return {
    alerts: property.alerts
  };
}

export const sampleUser = {
  id: "user_mock",
  name: "Mock User",
  email: "mock.user@example.com",
  orgId: "org_123"
};
