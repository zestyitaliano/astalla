import { z } from 'zod';

declare enum ColumnType {
    TEXT = "TEXT",
    NUMBER = "NUMBER",
    DATE = "DATE",
    BOOLEAN = "BOOLEAN",
    SELECT = "SELECT",
    REFERENCE = "REFERENCE"
}
declare const ColumnTypeSchema: z.ZodNativeEnum<typeof ColumnType>;
declare const columnTypeSchema: z.ZodNativeEnum<typeof ColumnType>;
declare const ScriptStatusEnum: z.ZodEnum<["DRAFT", "PUBLISHED"]>;
declare const ProviderActionParam: z.ZodObject<{
    name: z.ZodString;
    schema: z.ZodOptional<z.ZodAny>;
    required: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    schema?: any;
    required?: boolean | undefined;
}, {
    name: string;
    schema?: any;
    required?: boolean | undefined;
}>;
declare const ProviderManifest: z.ZodObject<{
    name: z.ZodString;
    actions: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        params: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            schema: z.ZodOptional<z.ZodAny>;
            required: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            schema?: any;
            required?: boolean | undefined;
        }, {
            name: string;
            schema?: any;
            required?: boolean | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        label: string;
        params?: {
            name: string;
            schema?: any;
            required?: boolean | undefined;
        }[] | undefined;
    }, {
        key: string;
        label: string;
        params?: {
            name: string;
            schema?: any;
            required?: boolean | undefined;
        }[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    actions: {
        key: string;
        label: string;
        params?: {
            name: string;
            schema?: any;
            required?: boolean | undefined;
        }[] | undefined;
    }[];
}, {
    name: string;
    actions: {
        key: string;
        label: string;
        params?: {
            name: string;
            schema?: any;
            required?: boolean | undefined;
        }[] | undefined;
    }[];
}>;
type ProviderManifest = z.infer<typeof ProviderManifest>;
declare const orgSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: string;
    updatedAt: string;
}, {
    name: string;
    id: string;
    createdAt: string;
    updatedAt: string;
}>;
declare const propertySchema: z.ZodObject<{
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
    name: string;
    id: string;
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
    name: string;
    id: string;
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
declare const userSchema: z.ZodObject<{
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
declare const basicAuthAccountSchema: z.ZodObject<{
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
declare const registerBasicAuthRequestSchema: z.ZodObject<{
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
declare const registerBasicAuthResponseSchema: z.ZodObject<{
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
declare const basicAuthLoginRequestSchema: z.ZodObject<{
    identifier: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    identifier: string;
}, {
    password: string;
    identifier: string;
}>;
declare const basicAuthLoginResponseSchema: z.ZodObject<{
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
declare const leadSchema: z.ZodObject<{
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
declare const leadEventSchema: z.ZodObject<{
    id: z.ZodString;
    leadId: z.ZodString;
    type: z.ZodEnum<["created", "contacted", "toured", "applied", "approved", "denied", "leased"]>;
    occurredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "created" | "contacted" | "toured" | "applied" | "approved" | "denied" | "leased";
    id: string;
    leadId: string;
    occurredAt: string;
}, {
    type: "created" | "contacted" | "toured" | "applied" | "approved" | "denied" | "leased";
    id: string;
    leadId: string;
    occurredAt: string;
}>;
declare const applicationSchema: z.ZodObject<{
    id: z.ZodString;
    leadId: z.ZodString;
    status: z.ZodEnum<["pending", "approved", "denied", "cancelled"]>;
    submittedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "approved" | "denied" | "pending" | "cancelled";
    id: string;
    leadId: string;
    submittedAt: string;
}, {
    status: "approved" | "denied" | "pending" | "cancelled";
    id: string;
    leadId: string;
    submittedAt: string;
}>;
declare const leaseSchema: z.ZodObject<{
    id: z.ZodString;
    propertyId: z.ZodString;
    leadId: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    status: z.ZodEnum<["draft", "active", "terminated", "expired"]>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "active" | "terminated" | "expired";
    id: string;
    propertyId: string;
    leadId: string;
    startDate: string;
    endDate: string;
}, {
    status: "draft" | "active" | "terminated" | "expired";
    id: string;
    propertyId: string;
    leadId: string;
    startDate: string;
    endDate: string;
}>;
declare const reviewSchema: z.ZodObject<{
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
declare const reportSnapshotSchema: z.ZodObject<{
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
declare const meResponseSchema: z.ZodObject<{
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
declare const occupancyMetricsSchema: z.ZodObject<{
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
declare const pipelineMetricsSchema: z.ZodObject<{
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
declare const costMetricsSchema: z.ZodObject<{
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
declare const featureFlagScopeSchema: z.ZodEnum<["workspace", "user"]>;
declare const featureFlagStateSchema: z.ZodObject<{
    flag: z.ZodString;
    workspaceId: z.ZodNullable<z.ZodString>;
    workspaceEnabled: z.ZodNullable<z.ZodBoolean>;
    userId: z.ZodNullable<z.ZodString>;
    userEnabled: z.ZodNullable<z.ZodBoolean>;
    effectiveEnabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    flag: string;
    workspaceId: string | null;
    workspaceEnabled: boolean | null;
    userId: string | null;
    userEnabled: boolean | null;
    effectiveEnabled: boolean;
}, {
    flag: string;
    workspaceId: string | null;
    workspaceEnabled: boolean | null;
    userId: string | null;
    userEnabled: boolean | null;
    effectiveEnabled: boolean;
}>;
declare const updateFeatureFlagRequestSchema: z.ZodObject<{
    scope: z.ZodEnum<["workspace", "user"]>;
    enabled: z.ZodBoolean;
    workspaceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    scope: "workspace" | "user";
    enabled: boolean;
    workspaceId?: string | null | undefined;
    userId?: string | null | undefined;
}, {
    scope: "workspace" | "user";
    enabled: boolean;
    workspaceId?: string | null | undefined;
    userId?: string | null | undefined;
}>;
declare const latestReviewsSchema: z.ZodObject<{
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
declare const weeklyReportSchema: z.ZodObject<Pick<{
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
declare const alertSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    detail: z.ZodString;
    severity: z.ZodEnum<["high", "medium", "low"]>;
    occurredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    label: string;
    id: string;
    occurredAt: string;
    detail: string;
    severity: "high" | "medium" | "low";
}, {
    label: string;
    id: string;
    occurredAt: string;
    detail: string;
    severity: "high" | "medium" | "low";
}>;
declare const alertsResponseSchema: z.ZodObject<{
    alerts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        detail: z.ZodString;
        severity: z.ZodEnum<["high", "medium", "low"]>;
        occurredAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: string;
        occurredAt: string;
        detail: string;
        severity: "high" | "medium" | "low";
    }, {
        label: string;
        id: string;
        occurredAt: string;
        detail: string;
        severity: "high" | "medium" | "low";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    alerts: {
        label: string;
        id: string;
        occurredAt: string;
        detail: string;
        severity: "high" | "medium" | "low";
    }[];
}, {
    alerts: {
        label: string;
        id: string;
        occurredAt: string;
        detail: string;
        severity: "high" | "medium" | "low";
    }[];
}>;
declare const sourceTypeSchema: z.ZodEnum<["ENTRATA", "GA4", "ADS", "GBP"]>;
declare const sourceStatusSchema: z.ZodEnum<["CONNECTED", "ERROR", "UNVERIFIED"]>;
declare const sourceAccountSchema: z.ZodObject<{
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
    type: "ENTRATA" | "GA4" | "ADS" | "GBP";
    id: string;
    createdAt: string;
    updatedAt: string;
    enabled: boolean;
    name?: string | null | undefined;
    status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
    propertyId?: string | undefined;
    lastSuccessAt?: string | null | undefined;
    lastErrorAt?: string | null | undefined;
}, {
    type: "ENTRATA" | "GA4" | "ADS" | "GBP";
    id: string;
    createdAt: string;
    updatedAt: string;
    enabled: boolean;
    name?: string | null | undefined;
    status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
    propertyId?: string | undefined;
    lastSuccessAt?: string | null | undefined;
    lastErrorAt?: string | null | undefined;
}>;
declare const credentialSummaryItemSchema: z.ZodObject<{
    key: z.ZodString;
    present: z.ZodBoolean;
    preview: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    key: string;
    present: boolean;
    preview?: string | undefined;
}, {
    key: string;
    present: boolean;
    preview?: string | undefined;
}>;
declare const sourceDetailSchema: z.ZodObject<{
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
} & {
    propertyName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    credentialSummary: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        present: z.ZodBoolean;
        preview: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        present: boolean;
        preview?: string | undefined;
    }, {
        key: string;
        present: boolean;
        preview?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "ENTRATA" | "GA4" | "ADS" | "GBP";
    id: string;
    createdAt: string;
    updatedAt: string;
    enabled: boolean;
    credentialSummary: {
        key: string;
        present: boolean;
        preview?: string | undefined;
    }[];
    name?: string | null | undefined;
    status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
    propertyId?: string | undefined;
    propertyName?: string | null | undefined;
    lastSuccessAt?: string | null | undefined;
    lastErrorAt?: string | null | undefined;
}, {
    type: "ENTRATA" | "GA4" | "ADS" | "GBP";
    id: string;
    createdAt: string;
    updatedAt: string;
    enabled: boolean;
    credentialSummary: {
        key: string;
        present: boolean;
        preview?: string | undefined;
    }[];
    name?: string | null | undefined;
    status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
    propertyId?: string | undefined;
    propertyName?: string | null | undefined;
    lastSuccessAt?: string | null | undefined;
    lastErrorAt?: string | null | undefined;
}>;
declare const providerScriptSchema: z.ZodObject<{
    code: z.ZodString;
    readme: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["DRAFT", "PUBLISHED"]>;
    version: z.ZodNumber;
    manifest: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        name: z.ZodString;
        actions: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            label: z.ZodString;
            params: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                schema: z.ZodOptional<z.ZodAny>;
                required: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                name: string;
                schema?: any;
                required?: boolean | undefined;
            }, {
                name: string;
                schema?: any;
                required?: boolean | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            key: string;
            label: string;
            params?: {
                name: string;
                schema?: any;
                required?: boolean | undefined;
            }[] | undefined;
        }, {
            key: string;
            label: string;
            params?: {
                name: string;
                schema?: any;
                required?: boolean | undefined;
            }[] | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        actions: {
            key: string;
            label: string;
            params?: {
                name: string;
                schema?: any;
                required?: boolean | undefined;
            }[] | undefined;
        }[];
    }, {
        name: string;
        actions: {
            key: string;
            label: string;
            params?: {
                name: string;
                schema?: any;
                required?: boolean | undefined;
            }[] | undefined;
        }[];
    }>>>;
}, "strip", z.ZodTypeAny, {
    code: string;
    status: "DRAFT" | "PUBLISHED";
    version: number;
    readme?: string | undefined;
    manifest?: {
        name: string;
        actions: {
            key: string;
            label: string;
            params?: {
                name: string;
                schema?: any;
                required?: boolean | undefined;
            }[] | undefined;
        }[];
    } | null | undefined;
}, {
    code: string;
    status: "DRAFT" | "PUBLISHED";
    version: number;
    readme?: string | undefined;
    manifest?: {
        name: string;
        actions: {
            key: string;
            label: string;
            params?: {
                name: string;
                schema?: any;
                required?: boolean | undefined;
            }[] | undefined;
        }[];
    } | null | undefined;
}>;
declare const providerValidateResponseSchema: z.ZodObject<{
    ok: z.ZodBoolean;
    result: z.ZodOptional<z.ZodUnknown>;
    latencyMs: z.ZodOptional<z.ZodNumber>;
    logs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    ok: boolean;
    result?: unknown;
    latencyMs?: number | undefined;
    logs?: string[] | undefined;
}, {
    ok: boolean;
    result?: unknown;
    latencyMs?: number | undefined;
    logs?: string[] | undefined;
}>;
declare const providerRunResponseSchema: z.ZodObject<{
    ok: z.ZodBoolean;
    result: z.ZodOptional<z.ZodUnknown>;
    rowsPersisted: z.ZodOptional<z.ZodNumber>;
    latencyMs: z.ZodOptional<z.ZodNumber>;
    logs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    ok: boolean;
    result?: unknown;
    latencyMs?: number | undefined;
    logs?: string[] | undefined;
    rowsPersisted?: number | undefined;
}, {
    ok: boolean;
    result?: unknown;
    latencyMs?: number | undefined;
    logs?: string[] | undefined;
    rowsPersisted?: number | undefined;
}>;
declare const sourceActionLogSchema: z.ZodObject<{
    id: z.ZodString;
    sourceId: z.ZodString;
    action: z.ZodString;
    ok: z.ZodBoolean;
    latencyMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    request: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
    response: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
    error: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    ok: boolean;
    sourceId: string;
    action: string;
    latencyMs?: number | null | undefined;
    request?: unknown;
    response?: unknown;
    error?: string | null | undefined;
    createdBy?: string | null | undefined;
}, {
    id: string;
    createdAt: string;
    ok: boolean;
    sourceId: string;
    action: string;
    latencyMs?: number | null | undefined;
    request?: unknown;
    response?: unknown;
    error?: string | null | undefined;
    createdBy?: string | null | undefined;
}>;
declare const sourceActionLogListSchema: z.ZodObject<{
    entries: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceId: z.ZodString;
        action: z.ZodString;
        ok: z.ZodBoolean;
        latencyMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        request: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
        response: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
        error: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        ok: boolean;
        sourceId: string;
        action: string;
        latencyMs?: number | null | undefined;
        request?: unknown;
        response?: unknown;
        error?: string | null | undefined;
        createdBy?: string | null | undefined;
    }, {
        id: string;
        createdAt: string;
        ok: boolean;
        sourceId: string;
        action: string;
        latencyMs?: number | null | undefined;
        request?: unknown;
        response?: unknown;
        error?: string | null | undefined;
        createdBy?: string | null | undefined;
    }>, "many">;
    nextCursor: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    entries: {
        id: string;
        createdAt: string;
        ok: boolean;
        sourceId: string;
        action: string;
        latencyMs?: number | null | undefined;
        request?: unknown;
        response?: unknown;
        error?: string | null | undefined;
        createdBy?: string | null | undefined;
    }[];
    nextCursor: string | null;
}, {
    entries: {
        id: string;
        createdAt: string;
        ok: boolean;
        sourceId: string;
        action: string;
        latencyMs?: number | null | undefined;
        request?: unknown;
        response?: unknown;
        error?: string | null | undefined;
        createdBy?: string | null | undefined;
    }[];
    nextCursor: string | null;
}>;
declare const listSourcesResponseSchema: z.ZodObject<{
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
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        id: string;
        createdAt: string;
        updatedAt: string;
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    }, {
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        id: string;
        createdAt: string;
        updatedAt: string;
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    sources: {
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        id: string;
        createdAt: string;
        updatedAt: string;
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    }[];
}, {
    sources: {
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        id: string;
        createdAt: string;
        updatedAt: string;
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    }[];
}>;
declare const createSourceRequestSchema: z.ZodObject<{
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
declare const updateSourceRequestSchema: z.ZodObject<{
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
declare const sourceMutationResponseSchema: z.ZodObject<{
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
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        id: string;
        createdAt: string;
        updatedAt: string;
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    }, {
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        id: string;
        createdAt: string;
        updatedAt: string;
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
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        id: string;
        createdAt: string;
        updatedAt: string;
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
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        id: string;
        createdAt: string;
        updatedAt: string;
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    };
    validationMessage?: string | undefined;
}>;
declare const sourceRunResponseSchema: z.ZodObject<{
    ok: z.ZodBoolean;
    mode: z.ZodEnum<["queued", "immediate"]>;
    source: z.ZodOptional<z.ZodObject<{
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
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        id: string;
        createdAt: string;
        updatedAt: string;
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    }, {
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        id: string;
        createdAt: string;
        updatedAt: string;
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    ok: boolean;
    mode: "queued" | "immediate";
    source?: {
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        id: string;
        createdAt: string;
        updatedAt: string;
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    } | undefined;
}, {
    ok: boolean;
    mode: "queued" | "immediate";
    source?: {
        type: "ENTRATA" | "GA4" | "ADS" | "GBP";
        id: string;
        createdAt: string;
        updatedAt: string;
        enabled: boolean;
        name?: string | null | undefined;
        status?: "CONNECTED" | "ERROR" | "UNVERIFIED" | null | undefined;
        propertyId?: string | undefined;
        lastSuccessAt?: string | null | undefined;
        lastErrorAt?: string | null | undefined;
    } | undefined;
}>;
declare const propertiesResponseSchema: z.ZodObject<{
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
    }, "name" | "id" | "city" | "state" | "propertyCode" | "region">, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        city: string;
        state: string;
        propertyCode?: string | undefined;
        region?: string | undefined;
    }, {
        name: string;
        id: string;
        city: string;
        state: string;
        propertyCode?: string | undefined;
        region?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    properties: {
        name: string;
        id: string;
        city: string;
        state: string;
        propertyCode?: string | undefined;
        region?: string | undefined;
    }[];
}, {
    properties: {
        name: string;
        id: string;
        city: string;
        state: string;
        propertyCode?: string | undefined;
        region?: string | undefined;
    }[];
}>;
declare const publicDashboardSchema: z.ZodObject<{
    id: z.ZodString;
    orgId: z.ZodString;
    propertyId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    title: z.ZodString;
    subdomain: z.ZodString;
    accessToken: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    config: z.ZodUnknown;
    isActive: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    orgId: string;
    title: string;
    subdomain: string;
    isActive: boolean;
    propertyId?: string | null | undefined;
    accessToken?: string | null | undefined;
    config?: unknown;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    orgId: string;
    title: string;
    subdomain: string;
    isActive: boolean;
    propertyId?: string | null | undefined;
    accessToken?: string | null | undefined;
    config?: unknown;
}>;
declare const publicDashboardListResponseSchema: z.ZodObject<{
    dashboards: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        orgId: z.ZodString;
        propertyId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        title: z.ZodString;
        subdomain: z.ZodString;
        accessToken: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        config: z.ZodUnknown;
        isActive: z.ZodBoolean;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        updatedAt: string;
        orgId: string;
        title: string;
        subdomain: string;
        isActive: boolean;
        propertyId?: string | null | undefined;
        accessToken?: string | null | undefined;
        config?: unknown;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        orgId: string;
        title: string;
        subdomain: string;
        isActive: boolean;
        propertyId?: string | null | undefined;
        accessToken?: string | null | undefined;
        config?: unknown;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    dashboards: {
        id: string;
        createdAt: string;
        updatedAt: string;
        orgId: string;
        title: string;
        subdomain: string;
        isActive: boolean;
        propertyId?: string | null | undefined;
        accessToken?: string | null | undefined;
        config?: unknown;
    }[];
}, {
    dashboards: {
        id: string;
        createdAt: string;
        updatedAt: string;
        orgId: string;
        title: string;
        subdomain: string;
        isActive: boolean;
        propertyId?: string | null | undefined;
        accessToken?: string | null | undefined;
        config?: unknown;
    }[];
}>;
declare const createPublicDashboardRequestSchema: z.ZodObject<{
    title: z.ZodString;
    subdomain: z.ZodString;
    orgId: z.ZodString;
    propertyId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    config: z.ZodUnknown;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    orgId: string;
    title: string;
    subdomain: string;
    propertyId?: string | null | undefined;
    config?: unknown;
    isActive?: boolean | undefined;
}, {
    orgId: string;
    title: string;
    subdomain: string;
    propertyId?: string | null | undefined;
    config?: unknown;
    isActive?: boolean | undefined;
}>;
declare const updatePublicDashboardRequestSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    subdomain: z.ZodOptional<z.ZodString>;
    orgId: z.ZodOptional<z.ZodString>;
    propertyId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    config: z.ZodOptional<z.ZodUnknown>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    orgId?: string | undefined;
    propertyId?: string | null | undefined;
    title?: string | undefined;
    subdomain?: string | undefined;
    config?: unknown;
    isActive?: boolean | undefined;
}, {
    orgId?: string | undefined;
    propertyId?: string | null | undefined;
    title?: string | undefined;
    subdomain?: string | undefined;
    config?: unknown;
    isActive?: boolean | undefined;
}>, {
    orgId?: string | undefined;
    propertyId?: string | null | undefined;
    title?: string | undefined;
    subdomain?: string | undefined;
    config?: unknown;
    isActive?: boolean | undefined;
}, {
    orgId?: string | undefined;
    propertyId?: string | null | undefined;
    title?: string | undefined;
    subdomain?: string | undefined;
    config?: unknown;
    isActive?: boolean | undefined;
}>;
declare const tableCellDtoSchema: z.ZodObject<{
    id: z.ZodString;
    rowId: z.ZodString;
    columnId: z.ZodString;
    value: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    rowId: string;
    columnId: string;
    value?: unknown;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    rowId: string;
    columnId: string;
    value?: unknown;
}>;
declare const tableColumnDtoSchema: z.ZodObject<{
    id: z.ZodString;
    tableId: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    type: z.ZodNativeEnum<typeof ColumnType>;
    position: z.ZodNumber;
    config: z.ZodOptional<z.ZodUnknown>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: ColumnType;
    id: string;
    createdAt: string;
    updatedAt: string;
    tableId: string;
    slug: string;
    position: number;
    config?: unknown;
}, {
    name: string;
    type: ColumnType;
    id: string;
    createdAt: string;
    updatedAt: string;
    tableId: string;
    slug: string;
    position: number;
    config?: unknown;
}>;
declare const tableRowDtoSchema: z.ZodObject<{
    id: z.ZodString;
    tableId: z.ZodString;
    position: z.ZodNumber;
    cells: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        rowId: z.ZodString;
        columnId: z.ZodString;
        value: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        updatedAt: string;
        rowId: string;
        columnId: string;
        value?: unknown;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        rowId: string;
        columnId: string;
        value?: unknown;
    }>, "many">;
    createdBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    updatedBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    tableId: string;
    position: number;
    cells: {
        id: string;
        createdAt: string;
        updatedAt: string;
        rowId: string;
        columnId: string;
        value?: unknown;
    }[];
    createdBy?: string | null | undefined;
    updatedBy?: string | null | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    tableId: string;
    position: number;
    cells: {
        id: string;
        createdAt: string;
        updatedAt: string;
        rowId: string;
        columnId: string;
        value?: unknown;
    }[];
    createdBy?: string | null | undefined;
    updatedBy?: string | null | undefined;
}>;
declare const tableViewDtoSchema: z.ZodObject<{
    id: z.ZodString;
    tableId: z.ZodString;
    name: z.ZodString;
    config: z.ZodUnknown;
    createdBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    tableId: string;
    createdBy?: string | null | undefined;
    config?: unknown;
}, {
    name: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    tableId: string;
    createdBy?: string | null | undefined;
    config?: unknown;
}>;
declare const dataTableDtoSchema: z.ZodObject<{
    id: z.ZodString;
    orgId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    columns: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tableId: z.ZodString;
        name: z.ZodString;
        slug: z.ZodString;
        type: z.ZodNativeEnum<typeof ColumnType>;
        position: z.ZodNumber;
        config: z.ZodOptional<z.ZodUnknown>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: ColumnType;
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        slug: string;
        position: number;
        config?: unknown;
    }, {
        name: string;
        type: ColumnType;
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        slug: string;
        position: number;
        config?: unknown;
    }>, "many">>;
    rows: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tableId: z.ZodString;
        position: z.ZodNumber;
        cells: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            rowId: z.ZodString;
            columnId: z.ZodString;
            value: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            createdAt: string;
            updatedAt: string;
            rowId: string;
            columnId: string;
            value?: unknown;
        }, {
            id: string;
            createdAt: string;
            updatedAt: string;
            rowId: string;
            columnId: string;
            value?: unknown;
        }>, "many">;
        createdBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        updatedBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        position: number;
        cells: {
            id: string;
            createdAt: string;
            updatedAt: string;
            rowId: string;
            columnId: string;
            value?: unknown;
        }[];
        createdBy?: string | null | undefined;
        updatedBy?: string | null | undefined;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        position: number;
        cells: {
            id: string;
            createdAt: string;
            updatedAt: string;
            rowId: string;
            columnId: string;
            value?: unknown;
        }[];
        createdBy?: string | null | undefined;
        updatedBy?: string | null | undefined;
    }>, "many">>;
    views: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tableId: z.ZodString;
        name: z.ZodString;
        config: z.ZodUnknown;
        createdBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        createdBy?: string | null | undefined;
        config?: unknown;
    }, {
        name: string;
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        createdBy?: string | null | undefined;
        config?: unknown;
    }>, "many">>;
    createdBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    orgId: string;
    createdBy?: string | null | undefined;
    description?: string | null | undefined;
    columns?: {
        name: string;
        type: ColumnType;
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        slug: string;
        position: number;
        config?: unknown;
    }[] | undefined;
    rows?: {
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        position: number;
        cells: {
            id: string;
            createdAt: string;
            updatedAt: string;
            rowId: string;
            columnId: string;
            value?: unknown;
        }[];
        createdBy?: string | null | undefined;
        updatedBy?: string | null | undefined;
    }[] | undefined;
    views?: {
        name: string;
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        createdBy?: string | null | undefined;
        config?: unknown;
    }[] | undefined;
}, {
    name: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    orgId: string;
    createdBy?: string | null | undefined;
    description?: string | null | undefined;
    columns?: {
        name: string;
        type: ColumnType;
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        slug: string;
        position: number;
        config?: unknown;
    }[] | undefined;
    rows?: {
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        position: number;
        cells: {
            id: string;
            createdAt: string;
            updatedAt: string;
            rowId: string;
            columnId: string;
            value?: unknown;
        }[];
        createdBy?: string | null | undefined;
        updatedBy?: string | null | undefined;
    }[] | undefined;
    views?: {
        name: string;
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        createdBy?: string | null | undefined;
        config?: unknown;
    }[] | undefined;
}>;
declare const tableAuditDtoSchema: z.ZodObject<{
    id: z.ZodString;
    tableId: z.ZodString;
    actorId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    action: z.ZodString;
    payload: z.ZodUnknown;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    action: string;
    tableId: string;
    actorId?: string | null | undefined;
    payload?: unknown;
}, {
    id: string;
    createdAt: string;
    action: string;
    tableId: string;
    actorId?: string | null | undefined;
    payload?: unknown;
}>;
declare const createTableDtoSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
}>;
declare const updateTableDtoSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | null | undefined;
}, {
    name?: string | undefined;
    description?: string | null | undefined;
}>, {
    name?: string | undefined;
    description?: string | null | undefined;
}, {
    name?: string | undefined;
    description?: string | null | undefined;
}>;
declare const createColumnDtoSchema: z.ZodObject<{
    tableId: z.ZodString;
    name: z.ZodString;
    type: z.ZodNativeEnum<typeof ColumnType>;
    config: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: ColumnType;
    tableId: string;
    config?: unknown;
}, {
    name: string;
    type: ColumnType;
    tableId: string;
    config?: unknown;
}>;
declare const updateColumnDtoSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    position: z.ZodOptional<z.ZodNumber>;
    type: z.ZodOptional<z.ZodNativeEnum<typeof ColumnType>>;
    config: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    type?: ColumnType | undefined;
    config?: unknown;
    position?: number | undefined;
}, {
    name?: string | undefined;
    type?: ColumnType | undefined;
    config?: unknown;
    position?: number | undefined;
}>, {
    name?: string | undefined;
    type?: ColumnType | undefined;
    config?: unknown;
    position?: number | undefined;
}, {
    name?: string | undefined;
    type?: ColumnType | undefined;
    config?: unknown;
    position?: number | undefined;
}>;
declare const createRowDtoSchema: z.ZodObject<{
    tableId: z.ZodString;
    afterRowId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tableId: string;
    afterRowId?: string | undefined;
}, {
    tableId: string;
    afterRowId?: string | undefined;
}>;
declare const patchCellsDtoSchema: z.ZodObject<{
    rowId: z.ZodString;
    cells: z.ZodArray<z.ZodObject<{
        columnId: z.ZodString;
        value: z.ZodUnknown;
    }, "strip", z.ZodTypeAny, {
        columnId: string;
        value?: unknown;
    }, {
        columnId: string;
        value?: unknown;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    rowId: string;
    cells: {
        columnId: string;
        value?: unknown;
    }[];
}, {
    rowId: string;
    cells: {
        columnId: string;
        value?: unknown;
    }[];
}>;
declare const reorderRowsDtoSchema: z.ZodObject<{
    order: z.ZodArray<z.ZodObject<{
        rowId: z.ZodString;
        position: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        rowId: string;
        position: number;
    }, {
        rowId: string;
        position: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    order: {
        rowId: string;
        position: number;
    }[];
}, {
    order: {
        rowId: string;
        position: number;
    }[];
}>;
declare const createViewDtoSchema: z.ZodObject<{
    tableId: z.ZodString;
    name: z.ZodString;
    config: z.ZodObject<{
        hidden: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        columnOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        hidden: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        columnOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        hidden: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        columnOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    config: {
        hidden?: string[] | undefined;
        columnOrder?: string[] | undefined;
    } & {
        [k: string]: unknown;
    };
    tableId: string;
}, {
    name: string;
    config: {
        hidden?: string[] | undefined;
        columnOrder?: string[] | undefined;
    } & {
        [k: string]: unknown;
    };
    tableId: string;
}>;
declare const updateViewDtoSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodObject<{
        hidden: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        columnOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        hidden: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        columnOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        hidden: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        columnOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    config?: z.objectOutputType<{
        hidden: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        columnOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}, {
    name?: string | undefined;
    config?: z.objectInputType<{
        hidden: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        columnOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}>, {
    name?: string | undefined;
    config?: z.objectOutputType<{
        hidden: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        columnOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}, {
    name?: string | undefined;
    config?: z.objectInputType<{
        hidden: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        columnOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}>;
declare const tableQueryFilterSchema: z.ZodObject<{
    columnId: z.ZodString;
    operator: z.ZodEnum<["eq", "neq", "contains", "lt", "lte", "gt", "gte", "in", "notIn", "isEmpty", "isNotEmpty"]>;
    value: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    columnId: string;
    operator: "eq" | "neq" | "contains" | "lt" | "lte" | "gt" | "gte" | "in" | "notIn" | "isEmpty" | "isNotEmpty";
    value?: unknown;
}, {
    columnId: string;
    operator: "eq" | "neq" | "contains" | "lt" | "lte" | "gt" | "gte" | "in" | "notIn" | "isEmpty" | "isNotEmpty";
    value?: unknown;
}>;
declare const tableQuerySortSchema: z.ZodObject<{
    columnId: z.ZodString;
    direction: z.ZodEnum<["asc", "desc"]>;
}, "strip", z.ZodTypeAny, {
    columnId: string;
    direction: "asc" | "desc";
}, {
    columnId: string;
    direction: "asc" | "desc";
}>;
declare const tableQueryRequestSchema: z.ZodObject<{
    viewId: z.ZodOptional<z.ZodString>;
    filters: z.ZodOptional<z.ZodArray<z.ZodObject<{
        columnId: z.ZodString;
        operator: z.ZodEnum<["eq", "neq", "contains", "lt", "lte", "gt", "gte", "in", "notIn", "isEmpty", "isNotEmpty"]>;
        value: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        columnId: string;
        operator: "eq" | "neq" | "contains" | "lt" | "lte" | "gt" | "gte" | "in" | "notIn" | "isEmpty" | "isNotEmpty";
        value?: unknown;
    }, {
        columnId: string;
        operator: "eq" | "neq" | "contains" | "lt" | "lte" | "gt" | "gte" | "in" | "notIn" | "isEmpty" | "isNotEmpty";
        value?: unknown;
    }>, "many">>;
    sorts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        columnId: z.ZodString;
        direction: z.ZodEnum<["asc", "desc"]>;
    }, "strip", z.ZodTypeAny, {
        columnId: string;
        direction: "asc" | "desc";
    }, {
        columnId: string;
        direction: "asc" | "desc";
    }>, "many">>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    offset?: number | undefined;
    viewId?: string | undefined;
    filters?: {
        columnId: string;
        operator: "eq" | "neq" | "contains" | "lt" | "lte" | "gt" | "gte" | "in" | "notIn" | "isEmpty" | "isNotEmpty";
        value?: unknown;
    }[] | undefined;
    sorts?: {
        columnId: string;
        direction: "asc" | "desc";
    }[] | undefined;
    limit?: number | undefined;
}, {
    offset?: number | undefined;
    viewId?: string | undefined;
    filters?: {
        columnId: string;
        operator: "eq" | "neq" | "contains" | "lt" | "lte" | "gt" | "gte" | "in" | "notIn" | "isEmpty" | "isNotEmpty";
        value?: unknown;
    }[] | undefined;
    sorts?: {
        columnId: string;
        direction: "asc" | "desc";
    }[] | undefined;
    limit?: number | undefined;
}>;
declare const tableQueryResponseSchema: z.ZodObject<{
    rows: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tableId: z.ZodString;
        position: z.ZodNumber;
        cells: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            rowId: z.ZodString;
            columnId: z.ZodString;
            value: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            createdAt: string;
            updatedAt: string;
            rowId: string;
            columnId: string;
            value?: unknown;
        }, {
            id: string;
            createdAt: string;
            updatedAt: string;
            rowId: string;
            columnId: string;
            value?: unknown;
        }>, "many">;
        createdBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        updatedBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        position: number;
        cells: {
            id: string;
            createdAt: string;
            updatedAt: string;
            rowId: string;
            columnId: string;
            value?: unknown;
        }[];
        createdBy?: string | null | undefined;
        updatedBy?: string | null | undefined;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        position: number;
        cells: {
            id: string;
            createdAt: string;
            updatedAt: string;
            rowId: string;
            columnId: string;
            value?: unknown;
        }[];
        createdBy?: string | null | undefined;
        updatedBy?: string | null | undefined;
    }>, "many">;
    columns: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tableId: z.ZodString;
        name: z.ZodString;
        slug: z.ZodString;
        type: z.ZodNativeEnum<typeof ColumnType>;
        position: z.ZodNumber;
        config: z.ZodOptional<z.ZodUnknown>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: ColumnType;
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        slug: string;
        position: number;
        config?: unknown;
    }, {
        name: string;
        type: ColumnType;
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        slug: string;
        position: number;
        config?: unknown;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    columns: {
        name: string;
        type: ColumnType;
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        slug: string;
        position: number;
        config?: unknown;
    }[];
    rows: {
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        position: number;
        cells: {
            id: string;
            createdAt: string;
            updatedAt: string;
            rowId: string;
            columnId: string;
            value?: unknown;
        }[];
        createdBy?: string | null | undefined;
        updatedBy?: string | null | undefined;
    }[];
    total: number;
}, {
    columns: {
        name: string;
        type: ColumnType;
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        slug: string;
        position: number;
        config?: unknown;
    }[];
    rows: {
        id: string;
        createdAt: string;
        updatedAt: string;
        tableId: string;
        position: number;
        cells: {
            id: string;
            createdAt: string;
            updatedAt: string;
            rowId: string;
            columnId: string;
            value?: unknown;
        }[];
        createdBy?: string | null | undefined;
        updatedBy?: string | null | undefined;
    }[];
    total: number;
}>;
type Org = z.infer<typeof orgSchema>;
type Property = z.infer<typeof propertySchema>;
type User = z.infer<typeof userSchema>;
type BasicAuthAccount = z.infer<typeof basicAuthAccountSchema>;
type RegisterBasicAuthRequest = z.infer<typeof registerBasicAuthRequestSchema>;
type RegisterBasicAuthResponse = z.infer<typeof registerBasicAuthResponseSchema>;
type BasicAuthLoginRequest = z.infer<typeof basicAuthLoginRequestSchema>;
type BasicAuthLoginResponse = z.infer<typeof basicAuthLoginResponseSchema>;
type Lead = z.infer<typeof leadSchema>;
type LeadEvent = z.infer<typeof leadEventSchema>;
type Application = z.infer<typeof applicationSchema>;
type Lease = z.infer<typeof leaseSchema>;
type Review = z.infer<typeof reviewSchema>;
type ReportSnapshot = z.infer<typeof reportSnapshotSchema>;
type MeResponse = z.infer<typeof meResponseSchema>;
type OccupancyMetricsResponse = z.infer<typeof occupancyMetricsSchema>;
type PipelineMetricsResponse = z.infer<typeof pipelineMetricsSchema>;
type CostMetricsResponse = z.infer<typeof costMetricsSchema>;
type LatestReviewsResponse = z.infer<typeof latestReviewsSchema>;
type WeeklyReportResponse = z.infer<typeof weeklyReportSchema>;
type Alert = z.infer<typeof alertSchema>;
type AlertsResponse = z.infer<typeof alertsResponseSchema>;
type PropertiesResponse = z.infer<typeof propertiesResponseSchema>;
type SourceType = z.infer<typeof sourceTypeSchema>;
type SourceStatus = z.infer<typeof sourceStatusSchema>;
type SourceAccount = z.infer<typeof sourceAccountSchema>;
type CredentialSummaryItem = z.infer<typeof credentialSummaryItemSchema>;
type SourceDetail = z.infer<typeof sourceDetailSchema>;
type ListSourcesResponse = z.infer<typeof listSourcesResponseSchema>;
type CreateSourceRequest = z.infer<typeof createSourceRequestSchema>;
type UpdateSourceRequest = z.infer<typeof updateSourceRequestSchema>;
type SourceMutationResponse = z.infer<typeof sourceMutationResponseSchema>;
type SourceRunResponse = z.infer<typeof sourceRunResponseSchema>;
type ProviderScriptResponse = z.infer<typeof providerScriptSchema>;
type ProviderValidateResponse = z.infer<typeof providerValidateResponseSchema>;
type ProviderRunResponse = z.infer<typeof providerRunResponseSchema>;
type SourceActionLogEntry = z.infer<typeof sourceActionLogSchema>;
type SourceActionLogPage = z.infer<typeof sourceActionLogListSchema>;
type PublicDashboard = z.infer<typeof publicDashboardSchema>;
type PublicDashboardListResponse = z.infer<typeof publicDashboardListResponseSchema>;
type CreatePublicDashboardRequest = z.infer<typeof createPublicDashboardRequestSchema>;
type UpdatePublicDashboardRequest = z.infer<typeof updatePublicDashboardRequestSchema>;
type ColumnTypeValue = z.infer<typeof columnTypeSchema>;
type TableCellDto = z.infer<typeof tableCellDtoSchema>;
type TableColumnDto = z.infer<typeof tableColumnDtoSchema>;
type TableRowDto = z.infer<typeof tableRowDtoSchema>;
type TableViewDto = z.infer<typeof tableViewDtoSchema>;
type DataTableDto = z.infer<typeof dataTableDtoSchema>;
type TableAuditDto = z.infer<typeof tableAuditDtoSchema>;
type CreateTableDto = z.infer<typeof createTableDtoSchema>;
type UpdateTableDto = z.infer<typeof updateTableDtoSchema>;
type CreateColumnDto = z.infer<typeof createColumnDtoSchema>;
type UpdateColumnDto = z.infer<typeof updateColumnDtoSchema>;
type CreateRowDto = z.infer<typeof createRowDtoSchema>;
type PatchCellsDto = z.infer<typeof patchCellsDtoSchema>;
type ReorderRowsDto = z.infer<typeof reorderRowsDtoSchema>;
type CreateViewDto = z.infer<typeof createViewDtoSchema>;
type UpdateViewDto = z.infer<typeof updateViewDtoSchema>;
type TableQueryFilter = z.infer<typeof tableQueryFilterSchema>;
type TableQuerySort = z.infer<typeof tableQuerySortSchema>;
type TableQueryRequest = z.infer<typeof tableQueryRequestSchema>;
type TableQueryResponse = z.infer<typeof tableQueryResponseSchema>;

type ReferenceCardinality = 'single' | 'multi';
interface ReferenceConfig {
    targetTableId: string;
    displayColumnId: string | null;
    cardinality: ReferenceCardinality;
    enforceForeignKey: boolean;
}
interface SchemaColumn {
    id: string;
    name: string;
    type: 'reference' | string;
    isPII?: boolean;
    referenceConfig?: ReferenceConfig;
}
interface SchemaForeignKey {
    fromTable: string;
    fromCol: string;
    toTable: string;
    toCol: string;
}
interface SchemaTable {
    id: string;
    name: string;
    label?: string;
    columns: SchemaColumn[];
    fks: SchemaForeignKey[];
}
interface SchemaGraph {
    tables: SchemaTable[];
}

type FunctionName = "sum" | "count" | "avg" | "min" | "max";
interface SourceRange {
    start: number;
    end: number;
}
interface IdentifierNode {
    type: "Identifier";
    name: string;
    range?: SourceRange;
}
interface RefNode {
    type: "Ref";
    path: IdentifierNode[];
    range?: SourceRange;
}
type ValuePrimitive = string | number | boolean | null;
interface ValueNode {
    type: "Value";
    value: ValuePrimitive | ValuePrimitive[];
    range?: SourceRange;
}
type ComparisonOperator = "=" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "between";
type ComparisonRight = RefNode | ValueNode | Array<RefNode | ValueNode>;
interface ComparisonNode {
    type: "Comparison";
    operator: ComparisonOperator;
    left: RefNode | ValueNode;
    right: ComparisonRight;
    range?: SourceRange;
}
interface LogicalNode {
    type: "Logical";
    operator: "and" | "or";
    left: ConditionNode;
    right: ConditionNode;
    range?: SourceRange;
}
interface WhereNode {
    type: "Where";
    condition: ConditionNode;
    range?: SourceRange;
}
interface FunctionCallNode {
    type: "FunctionCall";
    name: FunctionName;
    argument: RefNode | ValueNode;
    where?: WhereNode;
    range?: SourceRange;
    nameRange?: SourceRange;
    closeRange?: SourceRange;
}
interface ProgramNode {
    type: "Program";
    body: FunctionCallNode;
    range?: SourceRange;
}
type ConditionNode = ComparisonNode | LogicalNode;
type ExpressionNode = FunctionCallNode | RefNode | ValueNode | ComparisonNode | LogicalNode;

declare const REF_AUTOCOMPLETE_V1: "ref-autocomplete-v1";
type FeatureFlagName = typeof REF_AUTOCOMPLETE_V1;

type FeatureFlagScope = z.infer<typeof featureFlagScopeSchema>;
type FeatureFlagState = z.infer<typeof featureFlagStateSchema>;
type UpdateFeatureFlagRequest = z.infer<typeof updateFeatureFlagRequestSchema>;

export { type Alert, type AlertsResponse, type Application, type BasicAuthAccount, type BasicAuthLoginRequest, type BasicAuthLoginResponse, ColumnType, ColumnTypeSchema, type ColumnTypeValue, type ComparisonNode, type ComparisonOperator, type ComparisonRight, type ConditionNode, type CostMetricsResponse, type CreateColumnDto, type CreatePublicDashboardRequest, type CreateRowDto, type CreateSourceRequest, type CreateTableDto, type CreateViewDto, type CredentialSummaryItem, type DataTableDto, type ExpressionNode, type FeatureFlagName, type FeatureFlagScope, type FeatureFlagState, type FunctionCallNode, type FunctionName, type IdentifierNode, type LatestReviewsResponse, type Lead, type LeadEvent, type Lease, type ListSourcesResponse, type LogicalNode, type MeResponse, type OccupancyMetricsResponse, type Org, type PatchCellsDto, type PipelineMetricsResponse, type ProgramNode, type PropertiesResponse, type Property, ProviderActionParam, ProviderManifest, type ProviderRunResponse, type ProviderScriptResponse, type ProviderValidateResponse, type PublicDashboard, type PublicDashboardListResponse, REF_AUTOCOMPLETE_V1, type RefNode, type ReferenceCardinality, type ReferenceConfig, type RegisterBasicAuthRequest, type RegisterBasicAuthResponse, type ReorderRowsDto, type ReportSnapshot, type Review, type SchemaColumn, type SchemaForeignKey, type SchemaGraph, type SchemaTable, ScriptStatusEnum, type SourceAccount, type SourceActionLogEntry, type SourceActionLogPage, type SourceDetail, type SourceMutationResponse, type SourceRange, type SourceRunResponse, type SourceStatus, type SourceType, type TableAuditDto, type TableCellDto, type TableColumnDto, type TableQueryFilter, type TableQueryRequest, type TableQueryResponse, type TableQuerySort, type TableRowDto, type TableViewDto, type UpdateColumnDto, type UpdateFeatureFlagRequest, type UpdatePublicDashboardRequest, type UpdateSourceRequest, type UpdateTableDto, type UpdateViewDto, type User, type ValueNode, type ValuePrimitive, type WeeklyReportResponse, type WhereNode, alertSchema, alertsResponseSchema, applicationSchema, basicAuthAccountSchema, basicAuthLoginRequestSchema, basicAuthLoginResponseSchema, columnTypeSchema, costMetricsSchema, createColumnDtoSchema, createPublicDashboardRequestSchema, createRowDtoSchema, createSourceRequestSchema, createTableDtoSchema, createViewDtoSchema, credentialSummaryItemSchema, dataTableDtoSchema, featureFlagScopeSchema, featureFlagStateSchema, latestReviewsSchema, leadEventSchema, leadSchema, leaseSchema, listSourcesResponseSchema, meResponseSchema, occupancyMetricsSchema, orgSchema, patchCellsDtoSchema, pipelineMetricsSchema, propertiesResponseSchema, propertySchema, providerRunResponseSchema, providerScriptSchema, providerValidateResponseSchema, publicDashboardListResponseSchema, publicDashboardSchema, registerBasicAuthRequestSchema, registerBasicAuthResponseSchema, reorderRowsDtoSchema, reportSnapshotSchema, reviewSchema, sourceAccountSchema, sourceActionLogListSchema, sourceActionLogSchema, sourceDetailSchema, sourceMutationResponseSchema, sourceRunResponseSchema, sourceStatusSchema, sourceTypeSchema, tableAuditDtoSchema, tableCellDtoSchema, tableColumnDtoSchema, tableQueryFilterSchema, tableQueryRequestSchema, tableQueryResponseSchema, tableQuerySortSchema, tableRowDtoSchema, tableViewDtoSchema, updateColumnDtoSchema, updateFeatureFlagRequestSchema, updatePublicDashboardRequestSchema, updateSourceRequestSchema, updateTableDtoSchema, updateViewDtoSchema, userSchema, weeklyReportSchema };
