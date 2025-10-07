import { z } from "zod";

export const ColumnType = z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT", "REFERENCE"]);

export const ScriptStatusEnum = z.enum(["DRAFT", "PUBLISHED"]);

export const ProviderActionParam = z.object({
  name: z.string(),
  schema: z.any().optional(),
  required: z.boolean().optional()
});

export const ProviderManifest = z.object({
  name: z.string(),
  actions: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      params: z.array(ProviderActionParam).optional()
    })
  )
});

export type ProviderManifest = z.infer<typeof ProviderManifest>;

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
  updatedAt: z.string().datetime({ offset: true }),
  propertyCode: z.string().optional(),
  region: z.string().optional()
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
  orgId: z.string(),
  roles: z
    .array(
      z.object({
        role: z.string(),
        orgId: z.string(),
        propertyId: z.string().optional(),
        propertyCode: z.string().optional()
      })
    )
    .optional()
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
  trend: z.array(metricPointSchema),
  anticipatedOccupancy: z.number().optional(),
  upcomingMoveIns: z.number().optional(),
  upcomingMoveOuts: z.number().optional(),
  approvedApplications: z.number().optional()
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
    responseRate: z.number(),
    sentiment: z
      .object({
        positive: z.number(),
        negative: z.number(),
        topics: z.unknown()
      })
      .optional()
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

export const sourceTypeSchema = z.enum(["ENTRATA", "GA4", "ADS", "GBP"]);
export const sourceStatusSchema = z.enum(["CONNECTED", "ERROR", "UNVERIFIED"]);

export const sourceAccountSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  propertyId: z.string().optional(),
  type: sourceTypeSchema,
  status: sourceStatusSchema.nullable().optional(),
  lastSuccessAt: z.string().datetime({ offset: true }).nullable().optional(),
  lastErrorAt: z.string().datetime({ offset: true }).nullable().optional(),
  enabled: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});

export const listSourcesResponseSchema = z.object({
  sources: z.array(sourceAccountSchema)
});

export const createSourceRequestSchema = z.object({
  propertyId: z.string(),
  type: sourceTypeSchema,
  name: z.string().optional(),
  credential: z.record(z.unknown()),
  enabled: z.boolean().optional()
});

export const updateSourceRequestSchema = z.object({
  propertyId: z.string().optional(),
  name: z.string().optional(),
  credential: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional()
});

export const sourceMutationResponseSchema = z.object({
  source: sourceAccountSchema,
  validationMessage: z.string().optional()
});

export const propertiesResponseSchema = z.object({
  properties: z.array(
    propertySchema.pick({
      id: true,
      name: true,
      city: true,
      state: true,
      propertyCode: true,
      region: true
    })
  )
});

export const publicDashboardSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  propertyId: z.string().nullable().optional(),
  title: z.string(),
  subdomain: z.string(),
  accessToken: z.string().nullable().optional(),
  config: z.unknown(),
  isActive: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});

export const publicDashboardListResponseSchema = z.object({
  dashboards: z.array(publicDashboardSchema)
});

export const createPublicDashboardRequestSchema = z.object({
  title: z.string().min(1),
  subdomain: z.string().min(1),
  orgId: z.string().min(1),
  propertyId: z.string().optional().nullable(),
  config: z.unknown(),
  isActive: z.boolean().optional()
});

export const updatePublicDashboardRequestSchema = z
  .object({
    title: z.string().optional(),
    subdomain: z.string().optional(),
    orgId: z.string().optional(),
    propertyId: z.string().nullable().optional(),
    config: z.unknown().optional(),
    isActive: z.boolean().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Update payload cannot be empty"
  });

export const columnTypeSchema = ColumnType;

export const tableCellDtoSchema = z.object({
  id: z.string(),
  rowId: z.string(),
  columnId: z.string(),
  value: z.unknown().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});

export const tableColumnDtoSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  name: z.string(),
  slug: z.string(),
  type: columnTypeSchema,
  position: z.number(),
  config: z.unknown().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});

export const tableRowDtoSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  position: z.number(),
  cells: z.array(tableCellDtoSchema),
  createdBy: z.string().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});

export const tableViewDtoSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  name: z.string(),
  config: z.unknown(),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});

export const dataTableDtoSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  columns: z.array(tableColumnDtoSchema).optional(),
  rows: z.array(tableRowDtoSchema).optional(),
  views: z.array(tableViewDtoSchema).optional(),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});

export const tableAuditDtoSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  actorId: z.string().nullable().optional(),
  action: z.string(),
  payload: z.unknown(),
  createdAt: z.string().datetime({ offset: true })
});

export const createTableDtoSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

export const createColumnDtoSchema = z.object({
  tableId: z.string(),
  name: z.string().min(1),
  type: columnTypeSchema,
  config: z.unknown().optional()
});

export const updateColumnDtoSchema = z
  .object({
    name: z.string().optional(),
    position: z.number().int().optional(),
    config: z.unknown().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Update payload cannot be empty"
  });

export const createRowDtoSchema = z.object({
  tableId: z.string(),
  afterRowId: z.string().optional()
});

export const patchCellsDtoSchema = z.object({
  rowId: z.string(),
  cells: z.array(
    z.object({
      columnId: z.string(),
      value: z.unknown()
    })
  )
});

export const reorderRowsDtoSchema = z.object({
  order: z.array(
    z.object({
      rowId: z.string(),
      position: z.number().int()
    })
  )
});

export const createViewDtoSchema = z.object({
  tableId: z.string(),
  name: z.string().min(1),
  config: z.unknown()
});

export const updateViewDtoSchema = z
  .object({
    name: z.string().optional(),
    config: z.unknown().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Update payload cannot be empty"
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
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type SourceStatus = z.infer<typeof sourceStatusSchema>;
export type SourceAccount = z.infer<typeof sourceAccountSchema>;
export type ListSourcesResponse = z.infer<typeof listSourcesResponseSchema>;
export type CreateSourceRequest = z.infer<typeof createSourceRequestSchema>;
export type UpdateSourceRequest = z.infer<typeof updateSourceRequestSchema>;
export type SourceMutationResponse = z.infer<typeof sourceMutationResponseSchema>;
export type PublicDashboard = z.infer<typeof publicDashboardSchema>;
export type PublicDashboardListResponse = z.infer<typeof publicDashboardListResponseSchema>;
export type CreatePublicDashboardRequest = z.infer<typeof createPublicDashboardRequestSchema>;
export type UpdatePublicDashboardRequest = z.infer<typeof updatePublicDashboardRequestSchema>;
export type ColumnTypeValue = z.infer<typeof columnTypeSchema>;
export type TableCellDto = z.infer<typeof tableCellDtoSchema>;
export type TableColumnDto = z.infer<typeof tableColumnDtoSchema>;
export type TableRowDto = z.infer<typeof tableRowDtoSchema>;
export type TableViewDto = z.infer<typeof tableViewDtoSchema>;
export type DataTableDto = z.infer<typeof dataTableDtoSchema>;
export type TableAuditDto = z.infer<typeof tableAuditDtoSchema>;
export type CreateTableDto = z.infer<typeof createTableDtoSchema>;
export type CreateColumnDto = z.infer<typeof createColumnDtoSchema>;
export type UpdateColumnDto = z.infer<typeof updateColumnDtoSchema>;
export type CreateRowDto = z.infer<typeof createRowDtoSchema>;
export type PatchCellsDto = z.infer<typeof patchCellsDtoSchema>;
export type ReorderRowsDto = z.infer<typeof reorderRowsDtoSchema>;
export type CreateViewDto = z.infer<typeof createViewDtoSchema>;
export type UpdateViewDto = z.infer<typeof updateViewDtoSchema>;

export const TableColumnSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  name: z.string(),
  slug: z.string(),
  type: ColumnType,
  position: z.number(),
  config: z.any().optional(),
});

export const TableRowSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const TableCellSchema = z.object({
  id: z.string(),
  rowId: z.string(),
  columnId: z.string(),
  value: z.any().optional(),
});

export const TableViewSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  name: z.string(),
  config: z.any(),
});

export const DataTableSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  columns: z.array(TableColumnSchema).optional(),
  views: z.array(TableViewSchema).optional(),
});

export const CreateTableDto = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});
export const CreateColumnDto = z.object({
  tableId: z.string(),
  name: z.string().min(1),
  type: ColumnType,
  config: z.any().optional(),
  position: z.number().optional(),
});
export const UpdateColumnDto = z.object({
  name: z.string().optional(),
  position: z.number().optional(),
  config: z.any().optional(),
});
export const CreateRowDto = z.object({
  tableId: z.string(),
  afterRowId: z.string().optional(),
});
export const PatchCellsDto = z.object({
  rowId: z.string(),
  cells: z.array(z.object({ columnId: z.string(), value: z.any() })),
});
export const ReorderRowsDto = z.object({
  order: z.array(z.object({ rowId: z.string(), position: z.number() })),
});
export const CreateViewDto = z.object({
  tableId: z.string(),
  name: z.string(),
  config: z.any(),
});
export const UpdateViewDto = z.object({
  name: z.string().optional(),
  config: z.any().optional(),
});

export type TColumnType = z.infer<typeof ColumnType>;
export type TDataTable = z.infer<typeof DataTableSchema>;
