import { HttpResponse, http } from "msw";

type TrendPoint = { timestamp: string; value: number };

type PropertyData = {
  id: string;
  name: string;
  city: string;
  state: string;
  totalUnits: number;
  occupancy: Record<7 | 30 | 90, { rate: number; change: number; trend: TrendPoint[] }>;
  pipeline: Record<7 | 30 | 90, { leads: number; tours: number; started: number; approved: number; trend: TrendPoint[] }>;
  cost: Record<7 | 30 | 90, { cpl: number; spend: number; change: number; trend: TrendPoint[] }>;
  reviews: {
    summary: { averageRating: number; reviewCount: number; responseRate: number };
    recent: Array<{ id: string; author: string; rating: number; body: string; submittedAt: string }>;
  };
  alerts: Array<{ id: string; label: string; detail: string; severity: "high" | "medium" | "low"; occurredAt: string }>;
};

const now = Date.now();

function buildTrend(base: number, windowDays: number, factor = 0.05): TrendPoint[] {
  return Array.from({ length: windowDays }).map((_, index, array) => {
    const reverseIndex = array.length - index - 1;
    const timestamp = new Date(now - reverseIndex * 24 * 60 * 60 * 1000).toISOString();
    const offset = Math.sin((reverseIndex / windowDays) * Math.PI * 1.8) * factor;
    const value = Number((base + base * offset).toFixed(3));
    return { timestamp, value };
  });
}

const properties: PropertyData[] = [
  {
    id: "prop-atrium",
    name: "Atrium Center",
    city: "Austin",
    state: "TX",
    totalUnits: 360,
    occupancy: {
      7: { rate: 0.94, change: 0.012, trend: buildTrend(0.94, 7) },
      30: { rate: 0.932, change: 0.018, trend: buildTrend(0.932, 30) },
      90: { rate: 0.918, change: 0.024, trend: buildTrend(0.918, 90) }
    },
    pipeline: {
      7: { leads: 68, tours: 28, started: 18, approved: 12, trend: buildTrend(12, 7, 0.18) },
      30: { leads: 240, tours: 98, started: 72, approved: 44, trend: buildTrend(38, 30, 0.12) },
      90: { leads: 670, tours: 268, started: 202, approved: 134, trend: buildTrend(80, 90, 0.1) }
    },
    cost: {
      7: { cpl: 122.5, spend: 8400, change: -0.05, trend: buildTrend(122.5, 7, 0.07) },
      30: { cpl: 128.4, spend: 27800, change: -0.08, trend: buildTrend(128.4, 30, 0.05) },
      90: { cpl: 131.2, spend: 78250, change: -0.11, trend: buildTrend(131.2, 90, 0.04) }
    },
    reviews: {
      summary: { averageRating: 4.4, reviewCount: 128, responseRate: 0.86 },
      recent: [
        {
          id: "rev-atrium-1",
          author: "Alex Johnson",
          rating: 5,
          body: "Maintenance requests were resolved in less than a day.",
          submittedAt: new Date(now - 1000 * 60 * 60 * 6).toISOString()
        },
        {
          id: "rev-atrium-2",
          author: "Taylor Smith",
          rating: 4,
          body: "Loving the coworking space refresh—parking still tight though.",
          submittedAt: new Date(now - 1000 * 60 * 60 * 24).toISOString()
        }
      ]
    },
    alerts: [
      {
        id: "alert-atrium-lease",
        label: "Lease renewals",
        detail: "14 leases expiring within 45 days. Prep retention offers.",
        severity: "medium",
        occurredAt: new Date(now - 1000 * 60 * 45).toISOString()
      },
      {
        id: "alert-atrium-review",
        label: "Feedback spike",
        detail: "Elevator wait times mentioned in recent resident reviews.",
        severity: "low",
        occurredAt: new Date(now - 1000 * 60 * 60 * 5).toISOString()
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
      7: { rate: 0.888, change: -0.006, trend: buildTrend(0.888, 7) },
      30: { rate: 0.901, change: -0.012, trend: buildTrend(0.901, 30) },
      90: { rate: 0.914, change: -0.02, trend: buildTrend(0.914, 90) }
    },
    pipeline: {
      7: { leads: 52, tours: 26, started: 16, approved: 9, trend: buildTrend(10, 7, 0.16) },
      30: { leads: 182, tours: 88, started: 60, approved: 34, trend: buildTrend(30, 30, 0.11) },
      90: { leads: 520, tours: 245, started: 178, approved: 110, trend: buildTrend(58, 90, 0.09) }
    },
    cost: {
      7: { cpl: 146.2, spend: 9200, change: 0.06, trend: buildTrend(146.2, 7, 0.08) },
      30: { cpl: 152.8, spend: 31400, change: 0.08, trend: buildTrend(152.8, 30, 0.06) },
      90: { cpl: 158.4, spend: 90500, change: 0.1, trend: buildTrend(158.4, 90, 0.05) }
    },
    reviews: {
      summary: { averageRating: 4.1, reviewCount: 96, responseRate: 0.74 },
      recent: [
        {
          id: "rev-harbor-1",
          author: "Morgan Lee",
          rating: 3,
          body: "Lobby renovation noise has been rough, team remains responsive though.",
          submittedAt: new Date(now - 1000 * 60 * 60 * 8).toISOString()
        },
        {
          id: "rev-harbor-2",
          author: "Jordan Reyes",
          rating: 5,
          body: "Seamless move-in experience. Leasing team is top-notch!",
          submittedAt: new Date(now - 1000 * 60 * 60 * 32).toISOString()
        }
      ]
    },
    alerts: [
      {
        id: "alert-harbor-maint",
        label: "Maintenance backlog",
        detail: "Eight open tickets exceed SLA. Coordinate contractor availability.",
        severity: "high",
        occurredAt: new Date(now - 1000 * 60 * 60 * 2).toISOString()
      },
      {
        id: "alert-harbor-marketing",
        label: "Marketing spend spike",
        detail: "Paid social spend up 18% WoW with flat lead growth.",
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
      7: { rate: 0.864, change: 0.02, trend: buildTrend(0.864, 7) },
      30: { rate: 0.842, change: 0.014, trend: buildTrend(0.842, 30) },
      90: { rate: 0.826, change: 0.008, trend: buildTrend(0.826, 90) }
    },
    pipeline: {
      7: { leads: 46, tours: 19, started: 12, approved: 7, trend: buildTrend(9, 7, 0.15) },
      30: { leads: 158, tours: 64, started: 44, approved: 26, trend: buildTrend(24, 30, 0.1) },
      90: { leads: 420, tours: 170, started: 118, approved: 70, trend: buildTrend(46, 90, 0.08) }
    },
    cost: {
      7: { cpl: 118.1, spend: 6800, change: -0.12, trend: buildTrend(118.1, 7, 0.07) },
      30: { cpl: 121.6, spend: 22900, change: -0.16, trend: buildTrend(121.6, 30, 0.05) },
      90: { cpl: 126.2, spend: 66000, change: -0.2, trend: buildTrend(126.2, 90, 0.04) }
    },
    reviews: {
      summary: { averageRating: 4.6, reviewCount: 142, responseRate: 0.9 },
      recent: [
        {
          id: "rev-quartz-1",
          author: "Priya Patel",
          rating: 5,
          body: "Community events have boosted resident retention already!",
          submittedAt: new Date(now - 1000 * 60 * 60 * 5).toISOString()
        },
        {
          id: "rev-quartz-2",
          author: "Jamie Fox",
          rating: 4,
          body: "Security upgrades feel great—could use more EV charging spots.",
          submittedAt: new Date(now - 1000 * 60 * 60 * 18).toISOString()
        }
      ]
    },
    alerts: [
      {
        id: "alert-quartz-tour",
        label: "Tour velocity",
        detail: "Tours converting to leases in 5.4 days (target 7). Celebrate with ops team.",
        severity: "low",
        occurredAt: new Date(now - 1000 * 60 * 55).toISOString()
      },
      {
        id: "alert-quartz-utility",
        label: "Utility variance",
        detail: "Energy spend trending 9% below forecast thanks to LED retrofit.",
        severity: "medium",
        occurredAt: new Date(now - 1000 * 60 * 60 * 11).toISOString()
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

export const handlers = [
  http.get("*/auth/me", () =>
    HttpResponse.json({
      id: "user_mock",
      name: "Mock User",
      email: "mock.user@example.com",
      orgId: "org_123"
    })
  ),
  http.get("*/properties", () =>
    HttpResponse.json({
      properties: properties.map(({ id, name, city, state }) => ({ id, name, city, state }))
    })
  ),
  http.get("*/metrics/occupancy", ({ request }) => {
    const url = new URL(request.url);
    const propertyId = url.searchParams.get("propertyId") ?? undefined;
    const windowParam = resolveWindow(url.searchParams.get("window") ?? undefined);
    const property = resolveProperty(propertyId);
    const data = property.occupancy[windowParam];

    return HttpResponse.json({
      occupancyRate: data.rate,
      change: data.change,
      unitsOccupied: Math.round(property.totalUnits * data.rate),
      totalUnits: property.totalUnits,
      trend: data.trend
    });
  }),
  http.get("*/metrics/pipeline", ({ request }) => {
    const url = new URL(request.url);
    const propertyId = url.searchParams.get("propertyId") ?? undefined;
    const windowParam = resolveWindow(url.searchParams.get("window") ?? undefined);
    const property = resolveProperty(propertyId);
    const data = property.pipeline[windowParam];

    return HttpResponse.json({
      newLeads: data.leads,
      toursScheduled: data.tours,
      applicationsStarted: data.started,
      applicationsApproved: data.approved,
      trend: data.trend
    });
  }),
  http.get("*/metrics/cost", ({ request }) => {
    const url = new URL(request.url);
    const propertyId = url.searchParams.get("propertyId") ?? undefined;
    const windowParam = resolveWindow(url.searchParams.get("window") ?? undefined);
    const property = resolveProperty(propertyId);
    const data = property.cost[windowParam];

    return HttpResponse.json({
      costPerLead: data.cpl,
      marketingSpend: data.spend,
      spendChange: data.change,
      trend: data.trend
    });
  }),
  http.get("*/reviews/latest", ({ request }) => {
    const url = new URL(request.url);
    const propertyId = url.searchParams.get("propertyId") ?? undefined;
    const property = resolveProperty(propertyId);
    return HttpResponse.json(property.reviews);
  }),
  http.get("*/alerts", ({ request }) => {
    const url = new URL(request.url);
    const propertyId = url.searchParams.get("propertyId") ?? undefined;
    const property = resolveProperty(propertyId);
    return HttpResponse.json({ alerts: property.alerts });
  }),
  http.get("*/reports/weekly", () =>
    HttpResponse.json({
      generatedAt: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
      highlights: [
        "Occupancy climbed 1% WoW with 9 net new leases",
        "Lead-to-lease velocity improved by 14%",
        "CPL dipped below $130 driven by organic traffic"
      ],
      watchlist: [
        {
          propertyId: "prop-harbor",
          propertyName: "Harbor Tower",
          tag: "red",
          issue: "Maintenance backlog is increasing week-over-week"
        }
      ]
    })
  )
];
