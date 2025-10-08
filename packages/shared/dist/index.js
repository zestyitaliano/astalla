// src/schemas.ts
import { z } from "zod";
var ColumnType = z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT", "REFERENCE"]);
var ScriptStatusEnum = z.enum(["DRAFT", "PUBLISHED"]);
var ProviderActionParam = z.object({
  name: z.string(),
  schema: z.any().optional(),
  required: z.boolean().optional()
});
var ProviderManifest = z.object({
  name: z.string(),
  actions: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      params: z.array(ProviderActionParam).optional()
    })
  )
});
var orgSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});
var propertySchema = z.object({
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
var userSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().email(),
  orgId: z.string(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional()
});
var usernameSchema = z.string().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/, {
  message: "Username may only include letters, numbers, dots, underscores, or hyphens"
}).transform((value) => value.toLowerCase());
var basicAuthAccountSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  username: usernameSchema.nullable().optional(),
  orgId: z.string().optional()
});
var registerBasicAuthRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  username: usernameSchema.optional(),
  orgName: z.string().optional()
});
var registerBasicAuthResponseSchema = basicAuthAccountSchema;
var basicAuthLoginRequestSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1)
});
var basicAuthLoginResponseSchema = basicAuthAccountSchema;
var leadSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  source: z.string(),
  cost: z.number().nullable(),
  createdAt: z.string().datetime({ offset: true })
});
var leadEventSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  type: z.enum(["created", "contacted", "toured", "applied", "approved", "denied", "leased"]),
  occurredAt: z.string().datetime({ offset: true })
});
var applicationSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  status: z.enum(["pending", "approved", "denied", "cancelled"]),
  submittedAt: z.string().datetime({ offset: true })
});
var leaseSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  leadId: z.string(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  status: z.enum(["draft", "active", "terminated", "expired"])
});
var reviewSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  author: z.string(),
  rating: z.number().min(0).max(5),
  body: z.string(),
  submittedAt: z.string().datetime({ offset: true })
});
var reportSnapshotSchema = z.object({
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
var meResponseSchema = userSchema.extend({
  orgId: z.string(),
  roles: z.array(
    z.object({
      role: z.string(),
      orgId: z.string(),
      propertyId: z.string().optional(),
      propertyCode: z.string().optional()
    })
  ).optional()
});
var metricPointSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  value: z.number()
});
var occupancyMetricsSchema = z.object({
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
var pipelineMetricsSchema = z.object({
  newLeads: z.number(),
  toursScheduled: z.number(),
  applicationsStarted: z.number(),
  applicationsApproved: z.number(),
  trend: z.array(metricPointSchema)
});
var costMetricsSchema = z.object({
  costPerLead: z.number(),
  marketingSpend: z.number(),
  spendChange: z.number(),
  trend: z.array(metricPointSchema)
});
var latestReviewsSchema = z.object({
  summary: z.object({
    averageRating: z.number(),
    reviewCount: z.number(),
    responseRate: z.number(),
    sentiment: z.object({
      positive: z.number(),
      negative: z.number(),
      topics: z.unknown()
    }).optional()
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
var weeklyReportSchema = reportSnapshotSchema.pick({
  generatedAt: true,
  highlights: true,
  watchlist: true
});
var alertSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  occurredAt: z.string().datetime({ offset: true })
});
var alertsResponseSchema = z.object({
  alerts: z.array(alertSchema)
});
var sourceTypeSchema = z.enum(["ENTRATA", "GA4", "ADS", "GBP"]);
var sourceStatusSchema = z.enum(["CONNECTED", "ERROR", "UNVERIFIED"]);
var sourceAccountSchema = z.object({
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
var credentialSummaryItemSchema = z.object({
  key: z.string(),
  present: z.boolean(),
  preview: z.string().optional()
});
var sourceDetailSchema = sourceAccountSchema.extend({
  propertyName: z.string().nullable().optional(),
  credentialSummary: z.array(credentialSummaryItemSchema)
});
var providerScriptSchema = z.object({
  code: z.string(),
  readme: z.string().optional(),
  status: ScriptStatusEnum,
  version: z.number(),
  manifest: ProviderManifest.nullable().optional()
});
var providerValidateResponseSchema = z.object({
  ok: z.boolean(),
  result: z.unknown().optional(),
  latencyMs: z.number().optional(),
  logs: z.array(z.string()).optional()
});
var providerRunResponseSchema = z.object({
  ok: z.boolean(),
  result: z.unknown().optional(),
  rowsPersisted: z.number().optional(),
  latencyMs: z.number().optional(),
  logs: z.array(z.string()).optional()
});
var sourceActionLogSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  action: z.string(),
  ok: z.boolean(),
  latencyMs: z.number().nullable().optional(),
  request: z.unknown().nullable().optional(),
  response: z.unknown().nullable().optional(),
  error: z.string().nullable().optional(),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().datetime({ offset: true })
});
var sourceActionLogListSchema = z.array(sourceActionLogSchema);
var listSourcesResponseSchema = z.object({
  sources: z.array(sourceAccountSchema)
});
var createSourceRequestSchema = z.object({
  propertyId: z.string(),
  type: sourceTypeSchema,
  name: z.string().optional(),
  credential: z.record(z.unknown()),
  enabled: z.boolean().optional()
});
var updateSourceRequestSchema = z.object({
  propertyId: z.string().optional(),
  name: z.string().optional(),
  credential: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional()
});
var sourceMutationResponseSchema = z.object({
  source: sourceAccountSchema,
  validationMessage: z.string().optional()
});
var propertiesResponseSchema = z.object({
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
var publicDashboardSchema = z.object({
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
var publicDashboardListResponseSchema = z.object({
  dashboards: z.array(publicDashboardSchema)
});
var createPublicDashboardRequestSchema = z.object({
  title: z.string().min(1),
  subdomain: z.string().min(1),
  orgId: z.string().min(1),
  propertyId: z.string().optional().nullable(),
  config: z.unknown(),
  isActive: z.boolean().optional()
});
var updatePublicDashboardRequestSchema = z.object({
  title: z.string().optional(),
  subdomain: z.string().optional(),
  orgId: z.string().optional(),
  propertyId: z.string().nullable().optional(),
  config: z.unknown().optional(),
  isActive: z.boolean().optional()
}).refine((payload) => Object.keys(payload).length > 0, {
  message: "Update payload cannot be empty"
});
var columnTypeSchema = ColumnType;
var tableCellDtoSchema = z.object({
  id: z.string(),
  rowId: z.string(),
  columnId: z.string(),
  value: z.unknown().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});
var tableColumnDtoSchema = z.object({
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
var tableRowDtoSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  position: z.number(),
  cells: z.array(tableCellDtoSchema),
  createdBy: z.string().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});
var tableViewDtoSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  name: z.string(),
  config: z.unknown(),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
});
var dataTableDtoSchema = z.object({
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
var tableAuditDtoSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  actorId: z.string().nullable().optional(),
  action: z.string(),
  payload: z.unknown(),
  createdAt: z.string().datetime({ offset: true })
});
var createTableDtoSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});
var createColumnDtoSchema = z.object({
  tableId: z.string(),
  name: z.string().min(1),
  type: columnTypeSchema,
  config: z.unknown().optional()
});
var updateColumnDtoSchema = z.object({
  name: z.string().optional(),
  position: z.number().int().optional(),
  type: columnTypeSchema.optional(),
  config: z.unknown().optional()
}).refine((payload) => Object.keys(payload).length > 0, {
  message: "Update payload cannot be empty"
});
var createRowDtoSchema = z.object({
  tableId: z.string(),
  afterRowId: z.string().optional()
});
var patchCellsDtoSchema = z.object({
  rowId: z.string(),
  cells: z.array(
    z.object({
      columnId: z.string(),
      value: z.unknown()
    })
  )
});
var reorderRowsDtoSchema = z.object({
  order: z.array(
    z.object({
      rowId: z.string(),
      position: z.number().int()
    })
  )
});
var createViewDtoSchema = z.object({
  tableId: z.string(),
  name: z.string().min(1),
  config: z.unknown()
});
var updateViewDtoSchema = z.object({
  name: z.string().optional(),
  config: z.unknown().optional()
}).refine((payload) => Object.keys(payload).length > 0, {
  message: "Update payload cannot be empty"
});
var TableColumnSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  name: z.string(),
  slug: z.string(),
  type: ColumnType,
  position: z.number(),
  config: z.any().optional()
});
var TableRowSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
});
var TableCellSchema = z.object({
  id: z.string(),
  rowId: z.string(),
  columnId: z.string(),
  value: z.any().optional()
});
var TableViewSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  name: z.string(),
  config: z.any()
});
var DataTableSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  columns: z.array(TableColumnSchema).optional(),
  views: z.array(TableViewSchema).optional()
});
var CreateTableDto = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});
var CreateColumnDto = z.object({
  tableId: z.string(),
  name: z.string().min(1),
  type: ColumnType,
  config: z.any().optional(),
  position: z.number().optional()
});
var UpdateColumnDto = z.object({
  name: z.string().optional(),
  position: z.number().optional(),
  config: z.any().optional()
});
var CreateRowDto = z.object({
  tableId: z.string(),
  afterRowId: z.string().optional()
});
var PatchCellsDto = z.object({
  rowId: z.string(),
  cells: z.array(z.object({ columnId: z.string(), value: z.any() }))
});
var ReorderRowsDto = z.object({
  order: z.array(z.object({ rowId: z.string(), position: z.number() }))
});
var CreateViewDto = z.object({
  tableId: z.string(),
  name: z.string(),
  config: z.any()
});
var UpdateViewDto = z.object({
  name: z.string().optional(),
  config: z.any().optional()
});
export {
  ColumnType,
  CreateColumnDto,
  CreateRowDto,
  CreateTableDto,
  CreateViewDto,
  DataTableSchema,
  PatchCellsDto,
  ProviderActionParam,
  ProviderManifest,
  ReorderRowsDto,
  ScriptStatusEnum,
  TableCellSchema,
  TableColumnSchema,
  TableRowSchema,
  TableViewSchema,
  UpdateColumnDto,
  UpdateViewDto,
  alertSchema,
  alertsResponseSchema,
  applicationSchema,
  basicAuthAccountSchema,
  basicAuthLoginRequestSchema,
  basicAuthLoginResponseSchema,
  columnTypeSchema,
  costMetricsSchema,
  createColumnDtoSchema,
  createPublicDashboardRequestSchema,
  createRowDtoSchema,
  createSourceRequestSchema,
  createTableDtoSchema,
  createViewDtoSchema,
  credentialSummaryItemSchema,
  dataTableDtoSchema,
  latestReviewsSchema,
  leadEventSchema,
  leadSchema,
  leaseSchema,
  listSourcesResponseSchema,
  meResponseSchema,
  occupancyMetricsSchema,
  orgSchema,
  patchCellsDtoSchema,
  pipelineMetricsSchema,
  propertiesResponseSchema,
  propertySchema,
  providerRunResponseSchema,
  providerScriptSchema,
  providerValidateResponseSchema,
  publicDashboardListResponseSchema,
  publicDashboardSchema,
  registerBasicAuthRequestSchema,
  registerBasicAuthResponseSchema,
  reorderRowsDtoSchema,
  reportSnapshotSchema,
  reviewSchema,
  sourceAccountSchema,
  sourceActionLogListSchema,
  sourceActionLogSchema,
  sourceDetailSchema,
  sourceMutationResponseSchema,
  sourceStatusSchema,
  sourceTypeSchema,
  tableAuditDtoSchema,
  tableCellDtoSchema,
  tableColumnDtoSchema,
  tableRowDtoSchema,
  tableViewDtoSchema,
  updateColumnDtoSchema,
  updatePublicDashboardRequestSchema,
  updateSourceRequestSchema,
  updateViewDtoSchema,
  userSchema,
  weeklyReportSchema
};
//# sourceMappingURL=index.js.map