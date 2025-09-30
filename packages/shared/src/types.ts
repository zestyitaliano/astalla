import { z } from 'zod';

export const roleEnum = z.enum(['ORG_ADMIN', 'REGIONAL', 'PROPERTY', 'MARKETING']);

export const propertySummarySchema = z.object({
  id: z.string(),
  propertyCode: z.string(),
  name: z.string(),
  region: z.string().nullable().optional(),
  unitCount: z.number(),
});

export const orgSchema = z.object({
  id: z.string(),
  name: z.string(),
  properties: z.array(propertySummarySchema),
});

export const occupancyResponseSchema = z.object({
  current: z.number(),
  anticipated: z.number(),
  occupiedUnits: z.number(),
  totalUnits: z.number(),
});

export const pipelineResponseSchema = z.object({
  leads: z.number(),
  tours: z.number(),
  applications: z.number(),
  approvals: z.number(),
});

export const costResponseSchema = z.object({
  totalSpend: z.number(),
  totalConversions: z.number(),
  costPerLead: z.number().nullable(),
});

export const reviewSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  provider: z.string(),
  rating: z.number(),
  text: z.string(),
  at: z.string(),
});

export const reviewsResponseSchema = z.object({
  averageRating: z.number(),
  reviewCount: z.number(),
  positiveShare: z.number(),
  reviews: z.array(reviewSchema),
});

export const reportSnapshotSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  weekStart: z.string(),
  occupancy: z.number(),
  cpl: z.number(),
  cpls: z.number(),
  red: z.boolean(),
  watch: z.boolean(),
  json: z.unknown(),
});

export const authMeSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: roleEnum,
  orgId: z.string().nullable(),
  propertyScopes: z.array(z.object({ id: z.string(), propertyCode: z.string() })),
});

export type Role = z.infer<typeof roleEnum>;
export type Org = z.infer<typeof orgSchema>;
export type PropertySummary = z.infer<typeof propertySummarySchema>;
export type OccupancyResponse = z.infer<typeof occupancyResponseSchema>;
export type PipelineResponse = z.infer<typeof pipelineResponseSchema>;
export type CostResponse = z.infer<typeof costResponseSchema>;
export type ReviewsResponse = z.infer<typeof reviewsResponseSchema>;
export type ReportSnapshot = z.infer<typeof reportSnapshotSchema>;
export type AuthMeResponse = z.infer<typeof authMeSchema>;
