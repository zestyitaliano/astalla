"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ColumnType: () => ColumnType,
  ColumnTypeSchema: () => ColumnTypeSchema,
  ProviderActionParam: () => ProviderActionParam,
  ProviderManifest: () => ProviderManifest,
  ScriptStatusEnum: () => ScriptStatusEnum,
  alertSchema: () => alertSchema,
  alertsResponseSchema: () => alertsResponseSchema,
  applicationSchema: () => applicationSchema,
  basicAuthAccountSchema: () => basicAuthAccountSchema,
  basicAuthLoginRequestSchema: () => basicAuthLoginRequestSchema,
  basicAuthLoginResponseSchema: () => basicAuthLoginResponseSchema,
  columnTypeSchema: () => columnTypeSchema,
  costMetricsSchema: () => costMetricsSchema,
  createColumnDtoSchema: () => createColumnDtoSchema,
  createPublicDashboardRequestSchema: () => createPublicDashboardRequestSchema,
  createRowDtoSchema: () => createRowDtoSchema,
  createSourceRequestSchema: () => createSourceRequestSchema,
  createTableDtoSchema: () => createTableDtoSchema,
  createViewDtoSchema: () => createViewDtoSchema,
  credentialSummaryItemSchema: () => credentialSummaryItemSchema,
  dataTableDtoSchema: () => dataTableDtoSchema,
  latestReviewsSchema: () => latestReviewsSchema,
  leadEventSchema: () => leadEventSchema,
  leadSchema: () => leadSchema,
  leaseSchema: () => leaseSchema,
  listSourcesResponseSchema: () => listSourcesResponseSchema,
  meResponseSchema: () => meResponseSchema,
  occupancyMetricsSchema: () => occupancyMetricsSchema,
  orgSchema: () => orgSchema,
  patchCellsDtoSchema: () => patchCellsDtoSchema,
  pipelineMetricsSchema: () => pipelineMetricsSchema,
  propertiesResponseSchema: () => propertiesResponseSchema,
  propertySchema: () => propertySchema,
  providerRunResponseSchema: () => providerRunResponseSchema,
  providerScriptSchema: () => providerScriptSchema,
  providerValidateResponseSchema: () => providerValidateResponseSchema,
  publicDashboardListResponseSchema: () => publicDashboardListResponseSchema,
  publicDashboardSchema: () => publicDashboardSchema,
  registerBasicAuthRequestSchema: () => registerBasicAuthRequestSchema,
  registerBasicAuthResponseSchema: () => registerBasicAuthResponseSchema,
  reorderRowsDtoSchema: () => reorderRowsDtoSchema,
  reportSnapshotSchema: () => reportSnapshotSchema,
  reviewSchema: () => reviewSchema,
  sourceAccountSchema: () => sourceAccountSchema,
  sourceActionLogListSchema: () => sourceActionLogListSchema,
  sourceActionLogSchema: () => sourceActionLogSchema,
  sourceDetailSchema: () => sourceDetailSchema,
  sourceMutationResponseSchema: () => sourceMutationResponseSchema,
  sourceRunResponseSchema: () => sourceRunResponseSchema,
  sourceStatusSchema: () => sourceStatusSchema,
  sourceTypeSchema: () => sourceTypeSchema,
  tableAuditDtoSchema: () => tableAuditDtoSchema,
  tableCellDtoSchema: () => tableCellDtoSchema,
  tableColumnDtoSchema: () => tableColumnDtoSchema,
  tableQueryFilterSchema: () => tableQueryFilterSchema,
  tableQueryRequestSchema: () => tableQueryRequestSchema,
  tableQueryResponseSchema: () => tableQueryResponseSchema,
  tableQuerySortSchema: () => tableQuerySortSchema,
  tableRowDtoSchema: () => tableRowDtoSchema,
  tableViewDtoSchema: () => tableViewDtoSchema,
  updateColumnDtoSchema: () => updateColumnDtoSchema,
  updatePublicDashboardRequestSchema: () => updatePublicDashboardRequestSchema,
  updateSourceRequestSchema: () => updateSourceRequestSchema,
  updateViewDtoSchema: () => updateViewDtoSchema,
  userSchema: () => userSchema,
  weeklyReportSchema: () => weeklyReportSchema
});
module.exports = __toCommonJS(index_exports);

// src/schemas.ts
var import_zod = require("zod");
var ColumnType = /* @__PURE__ */ ((ColumnType2) => {
  ColumnType2["TEXT"] = "TEXT";
  ColumnType2["NUMBER"] = "NUMBER";
  ColumnType2["DATE"] = "DATE";
  ColumnType2["BOOLEAN"] = "BOOLEAN";
  ColumnType2["SELECT"] = "SELECT";
  ColumnType2["REFERENCE"] = "REFERENCE";
  return ColumnType2;
})(ColumnType || {});
var ColumnTypeSchema = import_zod.z.nativeEnum(ColumnType);
var columnTypeSchema = ColumnTypeSchema;
var ScriptStatusEnum = import_zod.z.enum(["DRAFT", "PUBLISHED"]);
var ProviderActionParam = import_zod.z.object({
  name: import_zod.z.string(),
  schema: import_zod.z.any().optional(),
  required: import_zod.z.boolean().optional()
});
var ProviderManifest = import_zod.z.object({
  name: import_zod.z.string(),
  actions: import_zod.z.array(
    import_zod.z.object({
      key: import_zod.z.string(),
      label: import_zod.z.string(),
      params: import_zod.z.array(ProviderActionParam).optional()
    })
  )
});
var orgSchema = import_zod.z.object({
  id: import_zod.z.string(),
  name: import_zod.z.string(),
  createdAt: import_zod.z.string().datetime({ offset: true }),
  updatedAt: import_zod.z.string().datetime({ offset: true })
});
var propertySchema = import_zod.z.object({
  id: import_zod.z.string(),
  name: import_zod.z.string(),
  address: import_zod.z.string(),
  city: import_zod.z.string(),
  state: import_zod.z.string(),
  zip: import_zod.z.string(),
  orgId: import_zod.z.string(),
  createdAt: import_zod.z.string().datetime({ offset: true }),
  updatedAt: import_zod.z.string().datetime({ offset: true }),
  propertyCode: import_zod.z.string().optional(),
  region: import_zod.z.string().optional()
});
var userSchema = import_zod.z.object({
  id: import_zod.z.string(),
  name: import_zod.z.string().optional(),
  email: import_zod.z.string().email(),
  orgId: import_zod.z.string(),
  createdAt: import_zod.z.string().datetime({ offset: true }).optional(),
  updatedAt: import_zod.z.string().datetime({ offset: true }).optional()
});
var usernameSchema = import_zod.z.string().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/, {
  message: "Username may only include letters, numbers, dots, underscores, or hyphens"
}).transform((value) => value.toLowerCase());
var basicAuthAccountSchema = import_zod.z.object({
  id: import_zod.z.string(),
  email: import_zod.z.string().email(),
  name: import_zod.z.string().nullable().optional(),
  username: usernameSchema.nullable().optional(),
  orgId: import_zod.z.string().optional()
});
var registerBasicAuthRequestSchema = import_zod.z.object({
  email: import_zod.z.string().email(),
  password: import_zod.z.string().min(8),
  name: import_zod.z.string().optional(),
  username: usernameSchema.optional(),
  orgName: import_zod.z.string().optional()
});
var registerBasicAuthResponseSchema = basicAuthAccountSchema;
var basicAuthLoginRequestSchema = import_zod.z.object({
  identifier: import_zod.z.string().min(1),
  password: import_zod.z.string().min(1)
});
var basicAuthLoginResponseSchema = basicAuthAccountSchema;
var leadSchema = import_zod.z.object({
  id: import_zod.z.string(),
  propertyId: import_zod.z.string(),
  source: import_zod.z.string(),
  cost: import_zod.z.number().nullable(),
  createdAt: import_zod.z.string().datetime({ offset: true })
});
var leadEventSchema = import_zod.z.object({
  id: import_zod.z.string(),
  leadId: import_zod.z.string(),
  type: import_zod.z.enum(["created", "contacted", "toured", "applied", "approved", "denied", "leased"]),
  occurredAt: import_zod.z.string().datetime({ offset: true })
});
var applicationSchema = import_zod.z.object({
  id: import_zod.z.string(),
  leadId: import_zod.z.string(),
  status: import_zod.z.enum(["pending", "approved", "denied", "cancelled"]),
  submittedAt: import_zod.z.string().datetime({ offset: true })
});
var leaseSchema = import_zod.z.object({
  id: import_zod.z.string(),
  propertyId: import_zod.z.string(),
  leadId: import_zod.z.string(),
  startDate: import_zod.z.string().date(),
  endDate: import_zod.z.string().date(),
  status: import_zod.z.enum(["draft", "active", "terminated", "expired"])
});
var reviewSchema = import_zod.z.object({
  id: import_zod.z.string(),
  propertyId: import_zod.z.string(),
  author: import_zod.z.string(),
  rating: import_zod.z.number().min(0).max(5),
  body: import_zod.z.string(),
  submittedAt: import_zod.z.string().datetime({ offset: true })
});
var reportSnapshotSchema = import_zod.z.object({
  id: import_zod.z.string(),
  orgId: import_zod.z.string(),
  generatedAt: import_zod.z.string().datetime({ offset: true }),
  highlights: import_zod.z.array(import_zod.z.string()),
  watchlist: import_zod.z.array(
    import_zod.z.object({
      propertyId: import_zod.z.string(),
      propertyName: import_zod.z.string(),
      tag: import_zod.z.enum(["red", "watch"]),
      issue: import_zod.z.string()
    })
  )
});
var meResponseSchema = userSchema.extend({
  orgId: import_zod.z.string(),
  roles: import_zod.z.array(
    import_zod.z.object({
      role: import_zod.z.string(),
      orgId: import_zod.z.string(),
      propertyId: import_zod.z.string().optional(),
      propertyCode: import_zod.z.string().optional()
    })
  ).optional()
});
var metricPointSchema = import_zod.z.object({
  timestamp: import_zod.z.string().datetime({ offset: true }),
  value: import_zod.z.number()
});
var occupancyMetricsSchema = import_zod.z.object({
  occupancyRate: import_zod.z.number(),
  change: import_zod.z.number(),
  unitsOccupied: import_zod.z.number(),
  totalUnits: import_zod.z.number(),
  trend: import_zod.z.array(metricPointSchema),
  anticipatedOccupancy: import_zod.z.number().optional(),
  upcomingMoveIns: import_zod.z.number().optional(),
  upcomingMoveOuts: import_zod.z.number().optional(),
  approvedApplications: import_zod.z.number().optional()
});
var pipelineMetricsSchema = import_zod.z.object({
  newLeads: import_zod.z.number(),
  toursScheduled: import_zod.z.number(),
  applicationsStarted: import_zod.z.number(),
  applicationsApproved: import_zod.z.number(),
  trend: import_zod.z.array(metricPointSchema)
});
var costMetricsSchema = import_zod.z.object({
  costPerLead: import_zod.z.number(),
  marketingSpend: import_zod.z.number(),
  spendChange: import_zod.z.number(),
  trend: import_zod.z.array(metricPointSchema)
});
var latestReviewsSchema = import_zod.z.object({
  summary: import_zod.z.object({
    averageRating: import_zod.z.number(),
    reviewCount: import_zod.z.number(),
    responseRate: import_zod.z.number(),
    sentiment: import_zod.z.object({
      positive: import_zod.z.number(),
      negative: import_zod.z.number(),
      topics: import_zod.z.unknown()
    }).optional()
  }),
  recent: import_zod.z.array(
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
var alertSchema = import_zod.z.object({
  id: import_zod.z.string(),
  label: import_zod.z.string(),
  detail: import_zod.z.string(),
  severity: import_zod.z.enum(["high", "medium", "low"]),
  occurredAt: import_zod.z.string().datetime({ offset: true })
});
var alertsResponseSchema = import_zod.z.object({
  alerts: import_zod.z.array(alertSchema)
});
var sourceTypeSchema = import_zod.z.enum(["ENTRATA", "GA4", "ADS", "GBP"]);
var sourceStatusSchema = import_zod.z.enum(["CONNECTED", "ERROR", "UNVERIFIED"]);
var sourceAccountSchema = import_zod.z.object({
  id: import_zod.z.string(),
  name: import_zod.z.string().nullable().optional(),
  propertyId: import_zod.z.string().optional(),
  type: sourceTypeSchema,
  status: sourceStatusSchema.nullable().optional(),
  lastSuccessAt: import_zod.z.string().datetime({ offset: true }).nullable().optional(),
  lastErrorAt: import_zod.z.string().datetime({ offset: true }).nullable().optional(),
  enabled: import_zod.z.boolean(),
  createdAt: import_zod.z.string().datetime({ offset: true }),
  updatedAt: import_zod.z.string().datetime({ offset: true })
});
var credentialSummaryItemSchema = import_zod.z.object({
  key: import_zod.z.string(),
  present: import_zod.z.boolean(),
  preview: import_zod.z.string().optional()
});
var sourceDetailSchema = sourceAccountSchema.extend({
  propertyName: import_zod.z.string().nullable().optional(),
  credentialSummary: import_zod.z.array(credentialSummaryItemSchema)
});
var providerScriptSchema = import_zod.z.object({
  code: import_zod.z.string(),
  readme: import_zod.z.string().optional(),
  status: ScriptStatusEnum,
  version: import_zod.z.number(),
  manifest: ProviderManifest.nullable().optional()
});
var providerValidateResponseSchema = import_zod.z.object({
  ok: import_zod.z.boolean(),
  result: import_zod.z.unknown().optional(),
  latencyMs: import_zod.z.number().optional(),
  logs: import_zod.z.array(import_zod.z.string()).optional()
});
var providerRunResponseSchema = import_zod.z.object({
  ok: import_zod.z.boolean(),
  result: import_zod.z.unknown().optional(),
  rowsPersisted: import_zod.z.number().optional(),
  latencyMs: import_zod.z.number().optional(),
  logs: import_zod.z.array(import_zod.z.string()).optional()
});
var sourceActionLogSchema = import_zod.z.object({
  id: import_zod.z.string(),
  sourceId: import_zod.z.string(),
  action: import_zod.z.string(),
  ok: import_zod.z.boolean(),
  latencyMs: import_zod.z.number().nullable().optional(),
  request: import_zod.z.unknown().nullable().optional(),
  response: import_zod.z.unknown().nullable().optional(),
  error: import_zod.z.string().nullable().optional(),
  createdBy: import_zod.z.string().nullable().optional(),
  createdAt: import_zod.z.string().datetime({ offset: true })
});
var sourceActionLogListSchema = import_zod.z.object({
  entries: import_zod.z.array(sourceActionLogSchema),
  nextCursor: import_zod.z.string().nullable()
});
var listSourcesResponseSchema = import_zod.z.object({
  sources: import_zod.z.array(sourceAccountSchema)
});
var createSourceRequestSchema = import_zod.z.object({
  propertyId: import_zod.z.string(),
  type: sourceTypeSchema,
  name: import_zod.z.string().optional(),
  credential: import_zod.z.record(import_zod.z.unknown()),
  enabled: import_zod.z.boolean().optional()
});
var updateSourceRequestSchema = import_zod.z.object({
  propertyId: import_zod.z.string().optional(),
  name: import_zod.z.string().optional(),
  credential: import_zod.z.record(import_zod.z.unknown()).optional(),
  enabled: import_zod.z.boolean().optional()
});
var sourceMutationResponseSchema = import_zod.z.object({
  source: sourceAccountSchema,
  validationMessage: import_zod.z.string().optional()
});
var sourceRunResponseSchema = import_zod.z.object({
  ok: import_zod.z.boolean(),
  mode: import_zod.z.enum(["queued", "immediate"]),
  source: sourceAccountSchema.optional()
});
var propertiesResponseSchema = import_zod.z.object({
  properties: import_zod.z.array(
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
var publicDashboardSchema = import_zod.z.object({
  id: import_zod.z.string(),
  orgId: import_zod.z.string(),
  propertyId: import_zod.z.string().nullable().optional(),
  title: import_zod.z.string(),
  subdomain: import_zod.z.string(),
  accessToken: import_zod.z.string().nullable().optional(),
  config: import_zod.z.unknown(),
  isActive: import_zod.z.boolean(),
  createdAt: import_zod.z.string().datetime({ offset: true }),
  updatedAt: import_zod.z.string().datetime({ offset: true })
});
var publicDashboardListResponseSchema = import_zod.z.object({
  dashboards: import_zod.z.array(publicDashboardSchema)
});
var createPublicDashboardRequestSchema = import_zod.z.object({
  title: import_zod.z.string().min(1),
  subdomain: import_zod.z.string().min(1),
  orgId: import_zod.z.string().min(1),
  propertyId: import_zod.z.string().optional().nullable(),
  config: import_zod.z.unknown(),
  isActive: import_zod.z.boolean().optional()
});
var updatePublicDashboardRequestSchema = import_zod.z.object({
  title: import_zod.z.string().optional(),
  subdomain: import_zod.z.string().optional(),
  orgId: import_zod.z.string().optional(),
  propertyId: import_zod.z.string().nullable().optional(),
  config: import_zod.z.unknown().optional(),
  isActive: import_zod.z.boolean().optional()
}).refine((payload) => Object.keys(payload).length > 0, {
  message: "Update payload cannot be empty"
});
var tableCellDtoSchema = import_zod.z.object({
  id: import_zod.z.string(),
  rowId: import_zod.z.string(),
  columnId: import_zod.z.string(),
  value: import_zod.z.unknown().nullable().optional(),
  createdAt: import_zod.z.string().datetime({ offset: true }),
  updatedAt: import_zod.z.string().datetime({ offset: true })
});
var tableColumnDtoSchema = import_zod.z.object({
  id: import_zod.z.string(),
  tableId: import_zod.z.string(),
  name: import_zod.z.string(),
  slug: import_zod.z.string(),
  type: columnTypeSchema,
  position: import_zod.z.number(),
  config: import_zod.z.unknown().optional(),
  createdAt: import_zod.z.string().datetime({ offset: true }),
  updatedAt: import_zod.z.string().datetime({ offset: true })
});
var tableRowDtoSchema = import_zod.z.object({
  id: import_zod.z.string(),
  tableId: import_zod.z.string(),
  position: import_zod.z.number(),
  cells: import_zod.z.array(tableCellDtoSchema),
  createdBy: import_zod.z.string().nullable().optional(),
  updatedBy: import_zod.z.string().nullable().optional(),
  createdAt: import_zod.z.string().datetime({ offset: true }),
  updatedAt: import_zod.z.string().datetime({ offset: true })
});
var tableViewDtoSchema = import_zod.z.object({
  id: import_zod.z.string(),
  tableId: import_zod.z.string(),
  name: import_zod.z.string(),
  config: import_zod.z.unknown(),
  createdBy: import_zod.z.string().nullable().optional(),
  createdAt: import_zod.z.string().datetime({ offset: true }),
  updatedAt: import_zod.z.string().datetime({ offset: true })
});
var dataTableDtoSchema = import_zod.z.object({
  id: import_zod.z.string(),
  orgId: import_zod.z.string(),
  name: import_zod.z.string(),
  description: import_zod.z.string().nullable().optional(),
  columns: import_zod.z.array(tableColumnDtoSchema).optional(),
  rows: import_zod.z.array(tableRowDtoSchema).optional(),
  views: import_zod.z.array(tableViewDtoSchema).optional(),
  createdBy: import_zod.z.string().nullable().optional(),
  createdAt: import_zod.z.string().datetime({ offset: true }),
  updatedAt: import_zod.z.string().datetime({ offset: true })
});
var tableAuditDtoSchema = import_zod.z.object({
  id: import_zod.z.string(),
  tableId: import_zod.z.string(),
  actorId: import_zod.z.string().nullable().optional(),
  action: import_zod.z.string(),
  payload: import_zod.z.unknown(),
  createdAt: import_zod.z.string().datetime({ offset: true })
});
var createTableDtoSchema = import_zod.z.object({
  name: import_zod.z.string().min(1),
  description: import_zod.z.string().optional()
});
var createColumnDtoSchema = import_zod.z.object({
  tableId: import_zod.z.string(),
  name: import_zod.z.string().min(1),
  type: columnTypeSchema,
  config: import_zod.z.unknown().optional()
});
var updateColumnDtoSchema = import_zod.z.object({
  name: import_zod.z.string().optional(),
  position: import_zod.z.number().int().optional(),
  type: columnTypeSchema.optional(),
  config: import_zod.z.unknown().optional()
}).refine((payload) => Object.keys(payload).length > 0, {
  message: "Update payload cannot be empty"
});
var createRowDtoSchema = import_zod.z.object({
  tableId: import_zod.z.string(),
  afterRowId: import_zod.z.string().optional()
});
var patchCellsDtoSchema = import_zod.z.object({
  rowId: import_zod.z.string(),
  cells: import_zod.z.array(
    import_zod.z.object({
      columnId: import_zod.z.string(),
      value: import_zod.z.unknown()
    })
  )
});
var reorderRowsDtoSchema = import_zod.z.object({
  order: import_zod.z.array(
    import_zod.z.object({
      rowId: import_zod.z.string(),
      position: import_zod.z.number().int()
    })
  )
});
var viewConfigSchema = import_zod.z.object({
  hidden: import_zod.z.array(import_zod.z.string()).optional(),
  columnOrder: import_zod.z.array(import_zod.z.string()).optional()
}).passthrough();
var createViewDtoSchema = import_zod.z.object({
  tableId: import_zod.z.string(),
  name: import_zod.z.string().min(1),
  config: viewConfigSchema
});
var updateViewDtoSchema = import_zod.z.object({
  name: import_zod.z.string().optional(),
  config: viewConfigSchema.optional()
}).refine((payload) => Object.keys(payload).length > 0, {
  message: "Update payload cannot be empty"
});
var tableQueryOperators = [
  "eq",
  "neq",
  "contains",
  "lt",
  "lte",
  "gt",
  "gte",
  "in",
  "notIn",
  "isEmpty",
  "isNotEmpty"
];
var tableQueryFilterSchema = import_zod.z.object({
  columnId: import_zod.z.string(),
  operator: import_zod.z.enum(tableQueryOperators),
  value: import_zod.z.unknown().optional()
});
var tableQuerySortSchema = import_zod.z.object({
  columnId: import_zod.z.string(),
  direction: import_zod.z.enum(["asc", "desc"])
});
var tableQueryRequestSchema = import_zod.z.object({
  viewId: import_zod.z.string().optional(),
  filters: import_zod.z.array(tableQueryFilterSchema).optional(),
  sorts: import_zod.z.array(tableQuerySortSchema).optional(),
  limit: import_zod.z.number().int().min(1).max(500).optional(),
  offset: import_zod.z.number().int().min(0).optional()
});
var tableQueryResponseSchema = import_zod.z.object({
  rows: import_zod.z.array(tableRowDtoSchema),
  columns: import_zod.z.array(tableColumnDtoSchema),
  total: import_zod.z.number().int().min(0)
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ColumnType,
  ColumnTypeSchema,
  ProviderActionParam,
  ProviderManifest,
  ScriptStatusEnum,
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
  sourceRunResponseSchema,
  sourceStatusSchema,
  sourceTypeSchema,
  tableAuditDtoSchema,
  tableCellDtoSchema,
  tableColumnDtoSchema,
  tableQueryFilterSchema,
  tableQueryRequestSchema,
  tableQueryResponseSchema,
  tableQuerySortSchema,
  tableRowDtoSchema,
  tableViewDtoSchema,
  updateColumnDtoSchema,
  updatePublicDashboardRequestSchema,
  updateSourceRequestSchema,
  updateViewDtoSchema,
  userSchema,
  weeklyReportSchema
});
//# sourceMappingURL=index.cjs.map