import { z } from 'zod';

export const RoleEnum = z.enum(['ORG_ADMIN', 'REGIONAL', 'PROPERTY', 'MARKETING']);
export type Role = z.infer<typeof RoleEnum>;

export const PropertySchema = z.object({
  id: z.string(),
  orgId: z.string(),
  propertyCode: z.string(),
  name: z.string(),
  region: z.string().nullable(),
  unitCount: z.number(),
  createdAt: z.string()
});
export type Property = z.infer<typeof PropertySchema>;

export const MetricTileSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  comparison: z.number().nullable(),
  trend: z.array(z.number()).optional(),
  unit: z.string().optional(),
  status: z.enum(['OK', 'WATCH', 'RED']).optional()
});
export type MetricTile = z.infer<typeof MetricTileSchema>;

export const WeeklyReportSchema = z.object({
  propertyId: z.string(),
  weekStart: z.string(),
  occupancy: z.number(),
  cpl: z.number(),
  cpls: z.number(),
  red: z.boolean(),
  watch: z.boolean(),
  json: z.record(z.string(), z.any())
});
export type WeeklyReport = z.infer<typeof WeeklyReportSchema>;

export const ReviewSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  rating: z.number(),
  text: z.string(),
  provider: z.literal('GBP'),
  at: z.string(),
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE'])
});
export type Review = z.infer<typeof ReviewSchema>;

export const OrgSelectorSchema = z.object({
  orgId: z.string(),
  orgName: z.string(),
  regions: z.array(z.object({
    region: z.string(),
    properties: z.array(PropertySchema)
  }))
});
export type OrgSelector = z.infer<typeof OrgSelectorSchema>;

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  roles: z.array(RoleEnum),
  propertyIds: z.array(z.string())
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const KPI_KEYS = {
  OCCUPANCY_CURRENT: 'occupancy_current',
  OCCUPANCY_30: 'occupancy_30',
  OCCUPANCY_60: 'occupancy_60',
  PIPELINE_VELOCITY: 'pipeline_velocity',
  CPL: 'cpl',
  CPLS: 'cpls',
  REVIEWS_POSITIVE: 'reviews_positive',
  RED_WATCH_STATUS: 'red_watch_status'
} as const;

export const ALL_ROLES: Role[] = ['ORG_ADMIN', 'REGIONAL', 'PROPERTY', 'MARKETING'];
