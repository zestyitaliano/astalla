import { z } from "zod";
export declare const orgSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}>;
export declare const propertySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    address: z.ZodString;
    city: z.ZodString;
    state: z.ZodString;
    zip: z.ZodString;
    orgId: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    propertyCode: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    orgId: string;
    propertyCode?: string | undefined;
    region?: string | undefined;
}, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    orgId: string;
    propertyCode?: string | undefined;
    region?: string | undefined;
}>;
export declare const userSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodString;
    orgId: z.ZodString;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    orgId: string;
    email: string;
    name?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}, {
    id: string;
    orgId: string;
    email: string;
    name?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}>;
export declare const basicAuthAccountSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    username: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
    orgId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    name?: string | null | undefined;
    orgId?: string | undefined;
    username?: string | null | undefined;
}, {
    id: string;
    email: string;
    name?: string | null | undefined;
    orgId?: string | undefined;
    username?: string | null | undefined;
}>;
export declare const registerBasicAuthRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    orgName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    name?: string | undefined;
    username?: string | undefined;
    orgName?: string | undefined;
}, {
    email: string;
    password: string;
    name?: string | undefined;
    username?: string | undefined;
    orgName?: string | undefined;
}>;
export declare const registerBasicAuthResponseSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    username: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
    orgId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    name?: string | null | undefined;
    orgId?: string | undefined;
    username?: string | null | undefined;
}, {
    id: string;
    email: string;
    name?: string | null | undefined;
    orgId?: string | undefined;
    username?: string | null | undefined;
}>;
export declare const basicAuthLoginRequestSchema: z.ZodObject<{
    identifier: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    identifier: string;
}, {
    password: string;
    identifier: string;
}>;
export declare const basicAuthLoginResponseSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    username: z.ZodOptional<z.ZodNullable<z.ZodEffects<z.ZodString, string, string>>>;
    orgId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    name?: string | null | undefined;
    orgId?: string | undefined;
    username?: string | null | undefined;
}, {
    id: string;
    email: string;
    name?: string | null | undefined;
    orgId?: string | undefined;
    username?: string | null | undefined;
}>;
export declare const leadSchema: z.ZodObject<{
    id: z.ZodString;
    propertyId: z.ZodString;
    source: z.ZodString;
    cost: z.ZodNullable<z.ZodNumber>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    propertyId: string;
    source: string;
    cost: number | null;
}, {
    id: string;
    createdAt: string;
    propertyId: string;
    source: string;
    cost: number | null;
}>;
export declare const leadEventSchema: z.ZodObject<{
    id: z.ZodString;
    leadId: z.ZodString;
    type: z.ZodEnum<["created", "contacted", "toured", "applied", "approved", "denied", "leased"]>;
    occurredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "created" | "contacted" | "toured" | "applied" | "approved" | "denied" | "leased";
    leadId: string;
    occurredAt: string;
}, {
    id: string;
    type: "created" | "contacted" | "toured" | "applied" | "approved" | "denied" | "leased";
    leadId: string;
    occurredAt: string;
}>;
export declare const applicationSchema: z.ZodObject<{
    id: z.ZodString;
    leadId: z.ZodString;
    status: z.ZodEnum<["pending", "approved", "denied", "cancelled"]>;
    submittedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "approved" | "denied" | "pending" | "cancelled";
    leadId: string;
    submittedAt: string;
}, {
    id: string;
    status: "approved" | "denied" | "pending" | "cancelled";
    leadId: string;
    submittedAt: string;
}>;
export declare const leaseSchema: z.ZodObject<{
    id: z.ZodString;
    propertyId: z.ZodString;
    leadId: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    status: z.ZodEnum<["draft", "active", "terminated", "expired"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "draft" | "active" | "terminated" | "expired";
    propertyId: string;
    leadId: string;
    startDate: string;
    endDate: string;
}, {
    id: string;
    status: "draft" | "active" | "terminated" | "expired";
    propertyId: string;
    leadId: string;
    startDate: string;
    endDate: string;
}>;
export declare const reviewSchema: z.ZodObject<{
    id: z.ZodString;
    propertyId: z.ZodString;
    author: z.ZodString;
    rating: z.ZodNumber;
    body: z.ZodString;
    submittedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    propertyId: string;
    submittedAt: string;
    author: string;
    rating: number;
    body: string;
}, {
    id: string;
    propertyId: string;
    submittedAt: string;
    author: string;
    rating: number;
    body: string;
}>;
export declare const reportSnapshotSchema: z.ZodObject<{
    id: z.ZodString;
    orgId: z.ZodString;
    generatedAt: z.ZodString;
    highlights: z.ZodArray<z.ZodString, "many">;
    watchlist: z.ZodArray<z.ZodObject<{
        propertyId: z.ZodString;
        propertyName: z.ZodString;
        tag: z.ZodEnum<["red", "watch"]>;
        issue: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        propertyId: string;
        propertyName: string;
        tag: "red" | "watch";
        issue: string;
    }, {
        propertyId: string;
        propertyName: string;
        tag: "red" | "watch";
        issue: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    orgId: string;
    generatedAt: string;
    highlights: string[];
    watchlist: {
        propertyId: string;
        propertyName: string;
        tag: "red" | "watch";
        issue: string;
    }[];
}, {
    id: string;
    orgId: string;
    generatedAt: string;
    highlights: string[];
    watchlist: {
        propertyId: string;
        propertyName: string;
        tag: "red" | "watch";
        issue: string;
    }[];
}>;
export declare const meResponseSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodString;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
} & {
    orgId: z.ZodString;
    roles: z.ZodOptional<z.ZodArray<z.ZodObject<{
        role: z.ZodString;
        orgId: z.ZodString;
        propertyId: z.ZodOptional<z.ZodString>;
        propertyCode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        orgId: string;
        role: string;
        propertyCode?: string | undefined;
        propertyId?: string | undefined;
    }, {
        orgId: string;
        role: string;
        propertyCode?: string | undefined;
        propertyId?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    orgId: string;
    email: string;
    name?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    roles?: {
        orgId: string;
        role: string;
        propertyCode?: string | undefined;
        propertyId?: string | undefined;
    }[] | undefined;
}, {
    id: string;
    orgId: string;
    email: string;
    name?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    roles?: {
        orgId: string;
        role: string;
        propertyCode?: string | undefined;
        propertyId?: string | undefined;
    }[] | undefined;
}>;
export declare const occupancyMetricsSchema: z.ZodObject<{
    occupancyRate: z.ZodNumber;
    change: z.ZodNumber;
    unitsOccupied: z.ZodNumber;
    totalUnits: z.ZodNumber;
    trend: z.ZodArray<z.ZodObject<{
        timestamp: z.ZodString;
        value: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: number;
        timestamp: string;
    }, {
        value: number;
        timestamp: string;
    }>, "many">;
    anticipatedOccupancy: z.ZodOptional<z.ZodNumber>;
    upcomingMoveIns: z.ZodOptional<z.ZodNumber>;
    upcomingMoveOuts: z.ZodOptional<z.ZodNumber>;
    approvedApplications: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    occupancyRate: number;
    change: number;
    unitsOccupied: number;
    totalUnits: number;
    trend: {
        value: number;
        timestamp: string;
    }[];
    anticipatedOccupancy?: number | undefined;
    upcomingMoveIns?: number | undefined;
    upcomingMoveOuts?: number | undefined;
    approvedApplications?: number | undefined;
}, {
    occupancyRate: number;
    change: number;
    unitsOccupied: number;
    totalUnits: number;
    trend: {
        value: number;
        timestamp: string;
    }[];
    anticipatedOccupancy?: number | undefined;
    upcomingMoveIns?: number | undefined;
    upcomingMoveOuts?: number | undefined;
    approvedApplications?: number | undefined;
}>;
export declare const pipelineMetricsSchema: z.ZodObject<{
    newLeads: z.ZodNumber;
    toursScheduled: z.ZodNumber;
    applicationsStarted: z.ZodNumber;
    applicationsApproved: z.ZodNumber;
    trend: z.ZodArray<z.ZodObject<{
        timestamp: z.ZodString;
        value: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: number;
        timestamp: string;
    }, {
        value: number;
        timestamp: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    trend: {
        value: number;
        timestamp: string;
    }[];
    newLeads: number;
    toursScheduled: number;
    applicationsStarted: number;
    applicationsApproved: number;
}, {
    trend: {
        value: number;
        timestamp: string;
    }[];
    newLeads: number;
    toursScheduled: number;
    applicationsStarted: number;
    applicationsApproved: number;
}>;
export declare const costMetricsSchema: z.ZodObject<{
    costPerLead: z.ZodNumber;
    marketingSpend: z.ZodNumber;
    spendChange: z.ZodNumber;
    trend: z.ZodArray<z.ZodObject<{
        timestamp: z.ZodString;
        value: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: number;
        timestamp: string;
    }, {
        value: number;
        timestamp: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    trend: {
        value: number;
        timestamp: string;
    }[];
    costPerLead: number;
    marketingSpend: number;
    spendChange: number;
}, {
    trend: {
        value: number;
        timestamp: string;
    }[];
    costPerLead: number;
    marketingSpend: number;
    spendChange: number;
}>;
export declare const latestReviewsSchema: z.ZodObject<{
    summary: z.ZodObject<{
        averageRating: z.ZodNumber;
        reviewCount: z.ZodNumber;
        responseRate: z.ZodNumber;
        sentiment: z.ZodOptional<z.ZodObject<{
            positive: z.ZodNumber;
            negative: z.ZodNumber;
            topics: z.ZodUnknown;
        }, "strip", z.ZodTypeAny, {
            positive: number;
            negative: number;
            topics?: unknown;
        }, {
            positive: number;
            negative: number;
            topics?: unknown;
        }>>;
    }, "strip", z.ZodTypeAny, {
        averageRating: number;
        reviewCount: number;
        responseRate: number;
        sentiment?: {
            positive: number;
            negative: number;
            topics?: unknown;
        } | undefined;
    }, {
        averageRating: number;
        reviewCount: number;
        responseRate: number;
        sentiment?: {
            positive: number;
            negative: number;
            topics?: unknown;
        } | undefined;
    }>;
    recent: z.ZodArray<z.ZodObject<Pick<{
        id: z.ZodString;
        propertyId: z.ZodString;
        author: z.ZodString;
        rating: z.ZodNumber;
        body: z.ZodString;
        submittedAt: z.ZodString;
    }, "id" | "submittedAt" | "author" | "rating" | "body">, "strip", z.ZodTypeAny, {
        id: string;
        submittedAt: string;
        author: string;
        rating: number;
        body: string;
    }, {
        id: string;
        submittedAt: string;
        author: string;
        rating: number;
        body: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    summary: {
        averageRating: number;
        reviewCount: number;
        responseRate: number;
        sentiment?: {
            positive: number;
            negative: number;
            topics?: unknown;
        } | undefined;
    };
    recent: {
        id: string;
        submittedAt: string;
        author: string;
        rating: number;
        body: string;
    }[];
}, {
    summary: {
        averageRating: number;
        reviewCount: number;
        responseRate: number;
        sentiment?: {
            positive: number;
            negative: number;
            topics?: unknown;
        } | undefined;
    };
    recent: {
        id: string;
        submittedAt: string;
        author: string;
        rating: number;
        body: string;
    }[];
}>;
export declare const weeklyReportSchema: z.ZodObject<Pick<{
    id: z.ZodString;
    orgId: z.ZodString;
    generatedAt: z.ZodString;
    highlights: z.ZodArray<z.ZodString, "many">;
    watchlist: z.ZodArray<z.ZodObject<{
        propertyId: z.ZodString;
        propertyName: z.ZodString;
        tag: z.ZodEnum<["red", "watch"]>;
        issue: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        propertyId: string;
        propertyName: string;
        tag: "red" | "watch";
        issue: string;
    }, {
        propertyId: string;
        propertyName: string;
        tag: "red" | "watch";
        issue: string;
    }>, "many">;
}, "generatedAt" | "highlights" | "watchlist">, "strip", z.ZodTypeAny, {
    generatedAt: string;
    highlights: string[];
    watchlist: {
        propertyId: string;
        propertyName: string;
        tag: "red" | "watch";
        issue: string;
    }[];
}, {
    generatedAt: string;
    highlights: string[];
    watchlist: {
        propertyId: string;
        propertyName: string;
        tag: "red" | "watch";
        issue: string;
    }[];
}>;
export declare const alertSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    detail: z.ZodString;
    severity: z.ZodEnum<["high", "medium", "low"]>;
    occurredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    occurredAt: string;
    label: string;
    detail: string;
    severity: "high" | "medium" | "low";
}, {
    id: string;
    occurredAt: string;
    label: string;
    detail: string;
    severity: "high" | "medium" | "low";
}>;
export declare const alertsResponseSchema: z.ZodObject<{
    alerts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        detail: z.ZodString;
        severity: z.ZodEnum<["high", "medium", "low"]>;
        occurredAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        occurredAt: string;
        label: string;
        detail: string;
        severity: "high" | "medium" | "low";
    }, {
        id: string;
        occurredAt: string;
        label: string;
        detail: string;
        severity: "high" | "medium" | "low";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    alerts: {
        id: string;
        occurredAt: string;
        label: string;
        detail: string;
        severity: "high" | "medium" | "low";
    }[];
}, {
    alerts: {
        id: string;
        occurredAt: string;
        label: string;
        detail: string;
        severity: "high" | "medium" | "low";
    }[];
}>;
export declare const sourceTypeSchema: z.ZodEnum<["ENTRATA", "GA4", "ADS", "GBP"]>;
export declare const sourceStatusSchema: z.ZodEnum<["CONNECTED", "ERROR", "UNVERIFIED"]>;
export declare const sourceAccountSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    propertyId: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["ENTRATA", "GA4", "ADS", "GBP"]>;
    status: z.ZodOptional<z.ZodNullable<z.ZodEnum<["CONNECTED", "ERROR", "UNVERIFIED"]>>>;
    lastSuccessAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lastErrorAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    enabled: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    type: "ENTRATA" | "GA4" | "ADS" | "GBP";
    enabled: boolean;
    name?: string | null | undefined;
    status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
    propertyId?: string | undefined;
    lastSuccessAt?: string | null | undefined;
    lastErrorAt?: string | null | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    type: "ENTRATA" | "GA4" | "ADS" | "GBP";
    enabled: boolean;
    name?: string | null | undefined;
    status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
    propertyId?: string | undefined;
    lastSuccessAt?: string | null | undefined;
    lastErrorAt?: string | null | undefined;
}>;
export declare const listSourcesResponseSchema: z.ZodObject<{
    sources: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        propertyId: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["ENTRATA", "GA4", "ADS", "GBP"]>;
        status: z.ZodOptional<z.ZodNullable<z.ZodEnum<["CONNECTED", "ERROR", "UNVERIFIED"]>>>;
        lastSuccessAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        lastErrorAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        enabled: z.ZodBoolean;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        updatedAt: string;
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    sources: {
        id: string;
        createdAt: string;
        updatedAt: string;
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    }[];
}, {
    sources: {
        id: string;
        createdAt: string;
        updatedAt: string;
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    }[];
}>;
export declare const createSourceRequestSchema: z.ZodObject<{
    propertyId: z.ZodString;
    type: z.ZodEnum<["ENTRATA", "GA4", "ADS", "GBP"]>;
    name: z.ZodOptional<z.ZodString>;
    credential: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    enabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "ENTRATA" | "GA4" | "ADS" | "GBP";
    propertyId: string;
    credential: Record<string, unknown>;
    name?: string | undefined;
    enabled?: boolean | undefined;
}, {
    type: "ENTRATA" | "GA4" | "ADS" | "GBP";
    propertyId: string;
    credential: Record<string, unknown>;
    name?: string | undefined;
    enabled?: boolean | undefined;
}>;
export declare const updateSourceRequestSchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    credential: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    enabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    propertyId?: string | undefined;
    enabled?: boolean | undefined;
    credential?: Record<string, unknown> | undefined;
}, {
    name?: string | undefined;
    propertyId?: string | undefined;
    enabled?: boolean | undefined;
    credential?: Record<string, unknown> | undefined;
}>;
export declare const sourceMutationResponseSchema: z.ZodObject<{
    source: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        propertyId: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["ENTRATA", "GA4", "ADS", "GBP"]>;
        status: z.ZodOptional<z.ZodNullable<z.ZodEnum<["CONNECTED", "ERROR", "UNVERIFIED"]>>>;
        lastSuccessAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        lastErrorAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        enabled: z.ZodBoolean;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        updatedAt: string;
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    }>;
    validationMessage: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    source: {
        id: string;
        createdAt: string;
        updatedAt: string;
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    };
    validationMessage?: string | undefined;
}, {
    source: {
        id: string;
        createdAt: string;
        updatedAt: string;
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    };
    validationMessage?: string | undefined;
}>;
export declare const propertiesResponseSchema: z.ZodObject<{
    properties: z.ZodArray<z.ZodObject<Pick<{
        id: z.ZodString;
        name: z.ZodString;
        address: z.ZodString;
        city: z.ZodString;
        state: z.ZodString;
        zip: z.ZodString;
        orgId: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        propertyCode: z.ZodOptional<z.ZodString>;
        region: z.ZodOptional<z.ZodString>;
    }, "id" | "name" | "city" | "state" | "propertyCode" | "region">, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        city: string;
        state: string;
        propertyCode?: string | undefined;
        region?: string | undefined;
    }, {
        id: string;
        name: string;
        city: string;
        state: string;
        propertyCode?: string | undefined;
        region?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    properties: {
        id: string;
        name: string;
        city: string;
        state: string;
        propertyCode?: string | undefined;
        region?: string | undefined;
    }[];
}, {
    properties: {
        id: string;
        name: string;
        city: string;
        state: string;
        propertyCode?: string | undefined;
        region?: string | undefined;
    }[];
}>;
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
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type SourceStatus = z.infer<typeof sourceStatusSchema>;
export type SourceAccount = z.infer<typeof sourceAccountSchema>;
export type ListSourcesResponse = z.infer<typeof listSourcesResponseSchema>;
export type CreateSourceRequest = z.infer<typeof createSourceRequestSchema>;
export type UpdateSourceRequest = z.infer<typeof updateSourceRequestSchema>;
export type SourceMutationResponse = z.infer<typeof sourceMutationResponseSchema>;
