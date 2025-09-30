export const sampleOccupancy = {
  occupancyRate: 0.93,
  change: 0.01,
  unitsOccupied: 325,
  totalUnits: 350
};

export const samplePipeline = {
  newLeads: 78,
  toursScheduled: 35,
  applicationsStarted: 22,
  applicationsApproved: 15
};

export const sampleCost = {
  costPerLead: 128.5,
  marketingSpend: 15400,
  spendChange: -0.08
};

export const sampleReviews = {
  summary: {
    averageRating: 4.3,
    reviewCount: 124,
    responseRate: 0.82
  },
  recent: [
    {
      id: "rev-1",
      author: "Alex Johnson",
      rating: 5,
      body: "Maintenance turnaround has been excellent—keep it up!",
      submittedAt: new Date().toISOString()
    },
    {
      id: "rev-2",
      author: "Taylor Smith",
      rating: 3,
      body: "Amenities are great, but parking is still limited.",
      submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
    }
  ]
};

export const sampleWeeklyReport = {
  generatedAt: new Date().toISOString(),
  highlights: [
    "Occupancy climbed 1% WoW with 9 net new leases",
    "Lead-to-lease velocity improved by 14%",
    "CPL dipped below $130 driven by organic traffic"
  ],
  watchlist: [
    {
      propertyId: "prop-red-001",
      propertyName: "Elmwood Flats",
      tag: "red" as const,
      issue: "Spike in negative reviews around maintenance"
    },
    {
      propertyId: "prop-watch-002",
      propertyName: "Harbor View Lofts",
      tag: "watch" as const,
      issue: "Pipeline slowing week-over-week"
    }
  ]
};

export const sampleUser = {
  id: "user_mock",
  name: "Mock User",
  email: "mock.user@example.com",
  orgId: "org_123"
};
