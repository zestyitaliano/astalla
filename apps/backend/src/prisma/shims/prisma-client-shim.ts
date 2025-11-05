// apps/backend/src/prisma/shims/prisma-client-shim.ts
// Lightweight shim to satisfy imports/types when backend is API-only.
// NOTE: This is a compile-time/runtime stub. Do not use for real DB access.

const MESSAGE =
  "@prisma/client shim: backend is API-only; use the API service instead of accessing the database.";

// Enums & types used in backend (add if referenced in code):
export enum UserRole {
  ORG_ADMIN = "ORG_ADMIN",
  REGIONAL = "REGIONAL",
  PROPERTY = "PROPERTY",
  MARKETING = "MARKETING"
}

export enum SourceAccountType {
  ENTRATA = "ENTRATA",
  GOOGLE_ADS = "GOOGLE_ADS",
  GA4 = "GA4",
  GBP = "GBP",
  WORDPRESS = "WORDPRESS"
}

export enum ApplicationStatus {
  STARTED = "STARTED",
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  DENIED = "DENIED",
  CANCELLED = "CANCELLED"
}

export enum LeaseStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  NOTICE = "NOTICE",
  TERMINATED = "TERMINATED"
}

export enum ReviewProvider {
  GBP = "GBP"
}

export enum ScriptStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED"
}

export enum ColumnType {
  TEXT = "TEXT",
  NUMBER = "NUMBER",
  DATE = "DATE",
  BOOLEAN = "BOOLEAN",
  SELECT = "SELECT",
  REFERENCE = "REFERENCE"
}

type AsyncMethod<T> = (...args: any[]) => Promise<T>;

type Delegate<TModel> = {
  findMany: AsyncMethod<TModel[]>;
  findUnique: AsyncMethod<TModel | null>;
  findUniqueOrThrow: AsyncMethod<TModel>;
  findFirst: AsyncMethod<TModel | null>;
  create: AsyncMethod<TModel>;
  update: AsyncMethod<TModel>;
  upsert: AsyncMethod<TModel>;
  delete: AsyncMethod<TModel>;
  deleteMany: AsyncMethod<{ count: number }>;
  updateMany: AsyncMethod<{ count: number }>;
  createMany: AsyncMethod<{ count: number }>;
  count: AsyncMethod<number>;
  aggregate: AsyncMethod<Record<string, any>>;
  groupBy: AsyncMethod<Array<Record<string, any>>>;
};

function createDelegate<TModel>(model: string): Delegate<TModel> {
  const handler: ProxyHandler<Record<string, AsyncMethod<TModel>>> = {
    get(_target, property) {
      const action = typeof property === "string" ? property : String(property);
      return async (..._args: any[]) => {
        throw new Error(`${MESSAGE} Attempted ${model}.${action}()`);
      };
    }
  };

  return new Proxy({}, handler) as unknown as Delegate<TModel>;
}

// Prisma namespace/type placeholders used in code paths (loose typing to compile):
export namespace Prisma {
  export type JsonValue = any;
  export type InputJsonValue = any;
  export type JsonObject = Record<string, any>;

  export class Decimal {
    private readonly value: number;

    constructor(value: number | string | bigint) {
      this.value = Number(value);
    }

    toNumber() {
      return this.value;
    }

    toString() {
      return String(this.value);
    }

    toJSON() {
      return this.value;
    }
  }

  export type LeadCreateInput = Record<string, any>;
  export type LeadUpdateInput = Record<string, any>;
  export type LeadWhereUniqueInput = Record<string, any>;
  export type PublicDashboardCreateInput = Record<string, any>;
  export type PublicDashboardUpdateInput = Record<string, any>;
  export type SourceAccountUpdateInput = Record<string, any>;
  export type DataTableUpdateInput = Record<string, any>;
  export type TableViewUpdateInput = Record<string, any>;
  export type TableColumnUpdateInput = Record<string, any>;
  export type TableCellCreateManyInput = Record<string, any>;

  export class PrismaClientKnownRequestError extends Error {
    code: string;

    constructor(message?: string, options?: { code?: string }) {
      super(message);
      this.code = options?.code ?? "";
      this.name = "PrismaClientKnownRequestError";
    }
  }

  export const JsonNull: unique symbol = Symbol("JsonNull");
  export const DbNull: unique symbol = Symbol("DbNull");

  export type TransactionClient = PrismaClient;
}

// Common model type placeholders referenced in imports:
export type User = {
  id: string;
  email: string;
  role: UserRole;
  [key: string]: any;
};

export interface TableColumn {
  id: string;
  tableId: string;
  name?: string;
  slug: string;
  type: ColumnType | string;
  position: number;
  config?: Prisma.JsonValue | null;
  referenceConfig?: Prisma.JsonValue | null;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

export interface TableCell {
  id: string;
  rowId: string;
  columnId: string;
  value?: any;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export interface TableRow {
  id: string;
  tableId: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
  cells: TableCell[];
  [key: string]: any;
}

export interface TableView {
  id: string;
  name?: string;
  config?: Prisma.JsonValue | null;
  [key: string]: any;
}

export interface DataTable {
  id: string;
  orgId?: string;
  name?: string;
  columns: TableColumn[];
  rows: TableRow[];
  views: TableView[];
  [key: string]: any;
}

export interface SourceAccount {
  id: string;
  type: SourceAccountType;
  propertyId: string | null;
  credential: any;
  enabled?: boolean;
  status?: string;
  lastSuccessAt?: Date | null;
  lastErrorAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export type PublicDashboard = any;
export type FeatureFlag = any;
export type Property = any;
export type Lease = any;
export type Application = any;
export type AvailabilitySnapshot = any;
export type Lead = any;
export type LeadEvent = any;
export type ChannelSpend = any;
export type ConversionEvent = any;
export type ProviderScript = any;
export type SourceActionLog = any;
export type Review = any;
export type SentimentSummary = any;
export type Alert = any;
export type ReportSnapshot = any;

// Minimal PrismaClient stub so 'new PrismaClient()' compiles in dev scripts.
// Properties are typed loosely to avoid type errors. Do not call in production.
export class PrismaClient {
  user: Delegate<User>;
  publicDashboard: Delegate<PublicDashboard>;
  featureFlag: Delegate<FeatureFlag>;
  property: Delegate<Property>;
  lease: Delegate<Lease>;
  application: Delegate<Application>;
  availabilitySnapshot: Delegate<AvailabilitySnapshot>;
  lead: Delegate<Lead>;
  leadEvent: Delegate<LeadEvent>;
  channelSpend: Delegate<ChannelSpend>;
  conversionEvent: Delegate<ConversionEvent>;
  providerScript: Delegate<ProviderScript>;
  sourceActionLog: Delegate<SourceActionLog>;
  sourceAccount: Delegate<SourceAccount>;
  review: Delegate<Review>;
  sentimentSummary: Delegate<SentimentSummary>;
  dataTable: Delegate<DataTable>;
  tableView: Delegate<TableView>;
  tableColumn: Delegate<TableColumn>;
  tableRow: Delegate<TableRow>;
  tableCell: Delegate<TableCell>;
  reportSnapshot: Delegate<ReportSnapshot>;
  tableAudit: Delegate<any>;
  alert: Delegate<Alert>;

  constructor(..._args: any[]) {
    this.user = createDelegate<User>("user");
    this.publicDashboard = createDelegate<PublicDashboard>("publicDashboard");
    this.featureFlag = createDelegate<FeatureFlag>("featureFlag");
    this.property = createDelegate<Property>("property");
    this.lease = createDelegate<Lease>("lease");
    this.application = createDelegate<Application>("application");
    this.availabilitySnapshot = createDelegate<AvailabilitySnapshot>("availabilitySnapshot");
    this.lead = createDelegate<Lead>("lead");
    this.leadEvent = createDelegate<LeadEvent>("leadEvent");
    this.channelSpend = createDelegate<ChannelSpend>("channelSpend");
    this.conversionEvent = createDelegate<ConversionEvent>("conversionEvent");
    this.providerScript = createDelegate<ProviderScript>("providerScript");
    this.sourceActionLog = createDelegate<SourceActionLog>("sourceActionLog");
    this.sourceAccount = createDelegate<SourceAccount>("sourceAccount");
    this.review = createDelegate<Review>("review");
    this.sentimentSummary = createDelegate<SentimentSummary>("sentimentSummary");
    this.dataTable = createDelegate<DataTable>("dataTable");
    this.tableView = createDelegate<TableView>("tableView");
    this.tableColumn = createDelegate<TableColumn>("tableColumn");
    this.tableRow = createDelegate<TableRow>("tableRow");
    this.tableCell = createDelegate<TableCell>("tableCell");
    this.reportSnapshot = createDelegate<ReportSnapshot>("reportSnapshot");
    this.tableAudit = createDelegate<any>("tableAudit");
    this.alert = createDelegate<Alert>("alert");
  }

  async $connect(): Promise<void> {
    console.warn(MESSAGE);
  }

  async $disconnect(): Promise<void> {
    console.warn(MESSAGE);
  }

  async $transaction<T = any>(_arg: any): Promise<T> {
    throw new Error(`${MESSAGE} Attempted transactional callback.`);
  }

  async $queryRaw<T = any>(..._args: any[]): Promise<T> {
    throw new Error(MESSAGE);
  }

  async $queryRawUnsafe<T = any>(..._args: any[]): Promise<T> {
    throw new Error(MESSAGE);
  }

  async $executeRaw<T = any>(..._args: any[]): Promise<T> {
    throw new Error(MESSAGE);
  }

  async $executeRawUnsafe<T = any>(..._args: any[]): Promise<T> {
    throw new Error(MESSAGE);
  }
}
