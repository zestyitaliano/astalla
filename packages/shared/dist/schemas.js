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
    watchlist: z.array(z.object({
        propertyId: z.string(),
        propertyName: z.string(),
        tag: z.enum(["red", "watch"]),
        issue: z.string()
    }))
});
export const meResponseSchema = userSchema.extend({
    orgId: z.string()
});
export const occupancyMetricsSchema = z.object({
    occupancyRate: z.number(),
    change: z.number(),
    unitsOccupied: z.number(),
    totalUnits: z.number()
});
export const pipelineMetricsSchema = z.object({
    newLeads: z.number(),
    toursScheduled: z.number(),
    applicationsStarted: z.number(),
    applicationsApproved: z.number()
});
export const costMetricsSchema = z.object({
    costPerLead: z.number(),
    marketingSpend: z.number(),
    spendChange: z.number()
});
export const latestReviewsSchema = z.object({
    summary: z.object({
        averageRating: z.number(),
        reviewCount: z.number(),
        responseRate: z.number()
    }),
    recent: z.array(reviewSchema.pick({
        id: true,
        author: true,
        rating: true,
        body: true,
        submittedAt: true
    }))
});
export const weeklyReportSchema = reportSnapshotSchema.pick({
    generatedAt: true,
    highlights: true,
    watchlist: true
});
