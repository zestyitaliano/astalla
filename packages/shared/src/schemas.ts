import { z } from "zod";

export const orgSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});

export const propertySchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  orgId: z.string(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});

export const userSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().email(),
  orgId: z.string(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional()
});

const usernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9._-]+$/, {
    message: "Username may only include letters, numbers, dots, underscores, or hyphens"
  })
  .transform((value) => value.toLowerCase());

export const basicAuthAccountSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  username: usernameSchema.nullable().optional(),
  orgId: z.string().optional()
});

export const registerBasicAuthRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  username: usernameSchema.optional(),
  orgName: z.string().optional()
});

export const registerBasicAuthResponseSchema = basicAuthAccountSchema;

export const basicAuthLoginRequestSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1)
});

export const basicAuthLoginResponseSchema = basicAuthAccountSchema;

export const leadSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  source: z.string(),
  cost: z.number().nullable(),
  createdAt: z.string().datetime({ offset: true })
});

export const leadEventSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  type: z.enum(["created", "contacted", "toured", "applied", "approved", "denied", "leased"]),
  occurredAt: z.string().datetime({ offset: true })
});

export const applicationSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  status: z.enum(["pending", "approved", "denied", "cancelled"]),
  submittedAt: z.string().datetime({ offset: true })
});

export const leaseSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  leadId: z.string(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  status: z.enum(["draft", "active", "terminated", "expired"])
});

export const reviewSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  author: z.string(),
  rating: z.number().min(0).max(5),
  body: z.string(),
  submittedAt: z.string().datetime({ offset: true })
});

export const reportSnapshotSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  generatedAt: z.string().datetime({ offset: true }),
  highlights: z.array(z.string()),
  watchlist: z.array(
    z.object({
      propertyId: z.string(),
      propertyName: z.string(),
      tag: z.enum(["red", "watch"]),
      issue: z.string()
    })
  )
});

export const meResponseSchema = userSchema.extend({
  orgId: z.string()
});

const metricPointSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  value: z.number()
});

export const occupancyMetricsSchema = z.object({
  occupancyRate: z.number(),
  change: z.number(),
  unitsOccupied: z.number(),
  totalUnits: z.number(),
  trend: z.array(metricPointSchema)
});

export const pipelineMetricsSchema = z.object({
  newLeads: z.number(),
  toursScheduled: z.number(),
  applicationsStarted: z.number(),
  applicationsApproved: z.number(),
  trend: z.array(metricPointSchema)
});

export const costMetricsSchema = z.object({
  costPerLead: z.number(),
  marketingSpend: z.number(),
  spendChange: z.number(),
  trend: z.array(metricPointSchema)
});

export const latestReviewsSchema = z.object({
  summary: z.object({
    averageRating: z.number(),
    reviewCount: z.number(),
    responseRate: z.number()
  }),
  recent: z.array(
    reviewSchema.pick({
      id: true,
      author: true,
      rating: true,
      body: true,
      submittedAt: true
    })
  )
});

export const weeklyReportSchema = reportSnapshotSchema.pick({
  generatedAt: true,
  highlights: true,
  watchlist: true
});

export const alertSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  occurredAt: z.string().datetime({ offset: true })
});

export const alertsResponseSchema = z.object({
  alerts: z.array(alertSchema)
});

export const propertiesResponseSchema = z.object({
  properties: z.array(
    propertySchema.pick({
      id: true,
      name: true,
      city: true,
      state: true
    })
  )
});

export type Org = z.infer<typeof orgSchema>;
export type Property = z.infer<typeof propertySchema>;
export type User = z.infer<typeof userSchema>;
export type BasicAuthAccount = z.infer<typeof basicAuthAccountSchema>;
export type RegisterBasicAuthRequest = z.infer<typeof registerBasicAuthRequestSchema>;
export type RegisterBasicAuthResponse = z.infer<typeof registerBasicAuthResponseSchema>;
export type BasicAuthLoginRequest = z.infer<typeof basicAuthLoginRequestSchema>;
export type BasicAuthLoginResponse = z.infer<typeof basicAuthLoginResponseSchema>;
export type Lead = z.infer<typeof leadSchema>;
export type LeadEvent = z.infer<typeof leadEventSchema>;
export type Application = z.infer<typeof applicationSchema>;
export type Lease = z.infer<typeof leaseSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type ReportSnapshot = z.infer<typeof reportSnapshotSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type OccupancyMetricsResponse = z.infer<typeof occupancyMetricsSchema>;
export type PipelineMetricsResponse = z.infer<typeof pipelineMetricsSchema>;
export type CostMetricsResponse = z.infer<typeof costMetricsSchema>;
export type LatestReviewsResponse = z.infer<typeof latestReviewsSchema>;
export type WeeklyReportResponse = z.infer<typeof weeklyReportSchema>;
export type Alert = z.infer<typeof alertSchema>;
export type AlertsResponse = z.infer<typeof alertsResponseSchema>;
export type PropertiesResponse = z.infer<typeof propertiesResponseSchema>;
