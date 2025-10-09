import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApplicationStatus,
  LeaseStatus,
  Prisma,
  ReviewProvider,
  ScriptStatus,
  SourceAccountType
} from "@prisma/client";
import { ProviderManifest as ProviderManifestSchema } from "@shared/api";
import type { ProviderManifest } from "@shared/api";
import { createHash, randomUUID } from "crypto";
import { transform } from "esbuild";
import { VM } from "vm2";

import { PrismaService } from "../prisma/prisma.service";
import { buildCredentialCipher, CredentialCipher } from "../util/credential-cipher";
import { JSON_NULL } from "../util/json";
import { redactSensitive } from "../util/redact";

const EXECUTION_TIMEOUT_MS = 15_000;
const RESPONSE_SIZE_LIMIT = 10 * 1024 * 1024;
const REQUEST_COOLDOWN_MS = 1_000;
const MAX_RUN_ROWS = 1_000;

const DEFAULT_SCRIPT_TEMPLATE = `import type { ProviderManifest } from "@shared/api";

export const manifest: ProviderManifest = {
  name: "Sample Provider",
  actions: []
};

export async function validate(creds: Record<string, unknown>, ctx: ProviderContext) {
  ctx.log("Validating credentials for", manifest.name);
  await ctx.fetchJson("https://example.com/status");
  return { ok: true };
}

export async function run(creds: Record<string, unknown>, ctx: ProviderContext) {
  ctx.log("Running", manifest.name);

  const rows = await ctx.fetchJson("https://example.com/data");

  if (Array.isArray(rows)) {
    await ctx.upsertRows("leads", rows.map((row) => ({
      externalId: String(row.id),
      source: row.source ?? "Demo",
      createdAt: row.createdAt
    })));
  }

  return { inserted: Array.isArray(rows) ? rows.length : 0 };
}

interface ProviderContext {
  fetchJson: typeof fetchJson;
  log: (...args: unknown[]) => void;
  upsertRows: (table: string, rows: unknown[]) => Promise<number>;
}

async function fetchJson(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  return response.json();
}
`;

const DEFAULT_README = `# Pack Studio

Use this studio to iterate on provider scripts. The runtime exposes:

- ctx.fetchJson(url, init?) – validated network requests with JSON parsing
- ctx.log(...args) – capture structured logs for validation and runs
- ctx.upsertRows(table, rows) – persist data (limit 1k rows per run)

Validate frequently and prefer small test runs.`;

type ProviderModuleExports = {
  manifest?: ProviderManifest;
  validate?: (creds: Record<string, unknown>, ctx: ProviderExecutionContext) => unknown | Promise<unknown>;
  actions?: Record<string, ProviderActionHandler>;
  run?: (creds: Record<string, unknown>, ctx: ProviderExecutionContext) => unknown | Promise<unknown>;
};

type ProviderActionHandler = (
  creds: Record<string, unknown>,
  params: unknown,
  ctx: ProviderExecutionContext
) => unknown | Promise<unknown>;

interface ProviderExecutionContext {
  fetch: typeof fetch;
  fetchJson: (input: Parameters<typeof fetch>[0], init?: RequestInit) => Promise<unknown>;
  log: (...args: unknown[]) => void;
  upsertRows: (table: string, rows: unknown[]) => Promise<number>;
}

interface SandboxResult {
  fetch: typeof fetch;
  console: {
    log: (...args: unknown[]) => void;
  };
  logs: string[];
}

interface ExecutionContextOptions {
  allowWrites: boolean;
  propertyId: string;
  runId: string;
  onRowsPersisted?: (total: number) => void;
}

type SourceActionLogEntry = Record<string, unknown> & {
  request: Prisma.InputJsonValue | null;
  response: Prisma.InputJsonValue | null;
};

@Injectable()
export class DevProvidersService {
  private readonly logger = new Logger(DevProvidersService.name);
  private readonly devMocksEnabled: boolean;
  private readonly credentialCipher: CredentialCipher;

  constructor(private readonly prisma: PrismaService, private readonly configService: ConfigService) {
    this.devMocksEnabled = this.configService.get<boolean>("devMocks") ?? false;
    const configuredKey = this.configService.get<string>("ENCRYPTION_KEY") ?? process.env.ENCRYPTION_KEY;
    this.credentialCipher = buildCredentialCipher(this.logger, configuredKey, "Provider credential");
  }

  async getScriptBySource(sourceId: string) {
    this.ensureDevMocksEnabled();
    const script = await this.prisma.providerScript.findUnique({ where: { sourceId } });
    if (!script) {
      return {
        code: DEFAULT_SCRIPT_TEMPLATE,
        readme: DEFAULT_README,
        status: ScriptStatus.DRAFT,
        version: 1,
        manifest: null
      };
    }

    let manifest: ProviderManifest | null = null;
    try {
      const compiled = await this.compileScript(script.code);
      const module = this.instantiateModule(compiled);
      if (module.manifest) {
        manifest = ProviderManifestSchema.parse(module.manifest);
      }
    } catch (error) {
      this.logger.warn(`Failed to load manifest for ${sourceId}: ${(error as Error).message}`);
    }

    return {
      code: script.code,
      readme: script.readme ?? DEFAULT_README,
      status: script.status,
      version: script.version,
      manifest
    };
  }

  async saveDraft(sourceId: string, code: string, readme?: string, createdBy?: string) {
    this.ensureDevMocksEnabled();
    const existing = await this.prisma.providerScript.findUnique({ where: { sourceId } });
    const nextVersion = existing ? (existing.code === code ? existing.version : existing.version + 1) : 1;

    const saved = await this.prisma.providerScript.upsert({
      where: { sourceId },
      update: { code, readme, status: ScriptStatus.DRAFT, version: nextVersion },
      create: { sourceId, code, readme, status: ScriptStatus.DRAFT, version: 1, createdBy }
    });

    return {
      code: saved.code,
      readme: saved.readme ?? DEFAULT_README,
      status: saved.status,
      version: saved.version
    };
  }

  async publish(sourceId: string, publishedBy?: string) {
    this.ensureDevMocksEnabled();
    const script = await this.prisma.providerScript.findUnique({ where: { sourceId } });
    if (!script) {
      throw new NotFoundException("No script to publish");
    }

    const updated = await this.prisma.providerScript.update({
      where: { sourceId },
      data: { status: ScriptStatus.PUBLISHED, createdBy: publishedBy ?? script.createdBy }
    });

    return {
      code: updated.code,
      status: updated.status,
      version: updated.version
    };
  }

  async runValidate(sourceId: string) {
    this.ensureDevMocksEnabled();
    const { source, script } = await this.loadSourceAndScript(sourceId);
    if (!script) {
      throw new NotFoundException("No script available");
    }

    const compiled = await this.compileScript(script.code);
    const sandbox = this.makeSandbox(source.type);
    const module = this.instantiateModule(compiled, sandbox.console);

    if (typeof module.validate !== "function") {
      throw new BadRequestException("Script does not export a validate function");
    }

    const credential = this.decryptCredential(source.credential);
    const ctx = this.createExecutionContext(sandbox, {
      allowWrites: false,
      propertyId: source.propertyId,
      runId: randomUUID()
    });

    const started = Date.now();
    try {
      const result = await this.runWithTimeout(module.validate(credential, ctx), EXECUTION_TIMEOUT_MS);
      return {
        ok: true,
        result: redactSensitive(result),
        latencyMs: Date.now() - started,
        logs: sandbox.logs.map((line) => String(redactSensitive(line)))
      };
    } catch (error) {
      this.logger.warn(`Validation failed for ${sourceId}: ${(error as Error).message}`);
      this.wrapScriptError(error, sandbox.logs);
    }
  }

  async run(sourceId: string, createdBy?: string) {
    this.ensureDevMocksEnabled();
    const { source, script } = await this.loadSourceAndScript(sourceId);
    if (!script) {
      throw new NotFoundException("No script available");
    }

    const compiled = await this.compileScript(script.code);
    const sandbox = this.makeSandbox(source.type);
    const module = this.instantiateModule(compiled, sandbox.console);

    if (typeof module.run !== "function") {
      throw new BadRequestException("Script does not export a run function");
    }

    const credential = this.decryptCredential(source.credential);
    const runId = randomUUID();
    let rowsPersisted = 0;

    const ctx = this.createExecutionContext(sandbox, {
      allowWrites: true,
      propertyId: source.propertyId,
      runId,
      onRowsPersisted: (total) => {
        rowsPersisted = total;
      }
    });

    const started = Date.now();
    let ok = false;
    let responseJson: Prisma.InputJsonValue | undefined;
    let errorMessage: string | undefined;

    try {
      const rawResult = await this.runWithTimeout(module.run(credential, ctx), EXECUTION_TIMEOUT_MS);
      ok = true;
      const redactedResponse = redactSensitive({ result: rawResult, logs: sandbox.logs, rowsPersisted });
      responseJson = this.asJson(redactedResponse);
      return {
        ok: true,
        result: redactSensitive(rawResult),
        rowsPersisted,
        logs: sandbox.logs.map((line) => String(redactSensitive(line))),
        latencyMs: Date.now() - started
      };
    } catch (error) {
      errorMessage = (error as Error).message;
      responseJson = this.asJson(redactSensitive({ logs: sandbox.logs, rowsPersisted }));
      this.logger.error(`Run failed for ${sourceId}: ${(error as Error).message}`);
      this.wrapScriptError(error, sandbox.logs);
    } finally {
      await this.prisma.sourceActionLog.create({
        data: {
          sourceId,
          action: "run",
          ok,
          latencyMs: ok ? Date.now() - started : null,
          request: this.asJson(redactSensitive({ runId })),
          response: responseJson,
          error: errorMessage,
          createdBy
        }
      });
    }
  }

  async listLogs(sourceId: string, limit?: number, cursor?: string) {
    this.ensureDevMocksEnabled();
    const take = limit && Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 100) : 20;
    const entries = await this.prisma.sourceActionLog.findMany({
      where: { sourceId },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor }
          }
        : {})
    });

    let nextCursor: string | null = null;
    if (entries.length > take) {
      const next = entries.pop();
      nextCursor = next ? next.id : null;
    }

    return {
      entries: entries.map((entry) => this.redactLogEntry(entry)),
      nextCursor
    };
  }

  private async loadSourceAndScript(sourceId: string, preferPublished = false) {
    const source = await this.prisma.sourceAccount.findUnique({ where: { id: sourceId } });
    if (!source) {
      throw new NotFoundException("Source not found");
    }

    const script = await this.prisma.providerScript.findUnique({ where: { sourceId } });
    if (!script) {
      return { source, script: null } as const;
    }

    if (preferPublished && script.status !== ScriptStatus.PUBLISHED) {
      this.logger.warn(`Source ${sourceId} has no published script; using draft`);
    }

    return { source, script } as const;
  }

  private makeSandbox(type: SourceAccountType): SandboxResult {
    const logs: string[] = [];
    let lastRequestAt = 0;

    const allowedDomains = this.allowedDomainsForSource(type);

    const fetchWrapper: typeof fetch = async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const target = this.resolveUrl(input);
      const url = new URL(target);
      if (!allowedDomains.includes(url.hostname)) {
        throw new Error(`Domain ${url.hostname} is not allowed for this source`);
      }

      const now = Date.now();
      if (now - lastRequestAt < REQUEST_COOLDOWN_MS) {
        throw new Error("Only one outbound request is permitted per second");
      }
      lastRequestAt = now;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

      try {
        const headers = new Headers(init?.headers);
        const response = await fetch(url, { ...init, headers, signal: controller.signal });
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > RESPONSE_SIZE_LIMIT) {
          throw new Error("Response exceeded 10MB limit");
        }

        return new Response(buffer, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      } finally {
        clearTimeout(timer);
      }
    };

    const sandboxConsole = {
      log: (...args: unknown[]) => {
        logs.push(args.map((value) => this.stringifyLog(value)).join(" "));
      }
    };

    return {
      fetch: fetchWrapper,
      console: sandboxConsole,
      logs
    };
  }

  private createExecutionContext(sandbox: SandboxResult, options: ExecutionContextOptions): ProviderExecutionContext {
    let totalRows = 0;

    const fetchJson: ProviderExecutionContext["fetchJson"] = async (input, init) => {
      const response = await sandbox.fetch(input, init);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("json")) {
        throw new Error("Expected JSON response");
      }

      try {
        return await response.json();
      } catch (error) {
        throw new Error(`Failed to parse JSON response: ${(error as Error).message}`);
      }
    };

    const log: ProviderExecutionContext["log"] = (...args) => {
      sandbox.console.log(...args);
    };

    const upsertRows: ProviderExecutionContext["upsertRows"] = async (table, rows) => {
      if (!options.allowWrites) {
        throw new Error("upsertRows is not available during validation");
      }
      if (!Array.isArray(rows)) {
        throw new Error("rows must be an array");
      }
      if (rows.length === 0) {
        return 0;
      }
      if (totalRows + rows.length > MAX_RUN_ROWS) {
        throw new Error(`Row limit exceeded. Only ${MAX_RUN_ROWS} rows are allowed per run.`);
      }

      const processed = await this.persistRows(table, rows, options.propertyId, options.runId);
      totalRows += processed;
      options.onRowsPersisted?.(totalRows);
      return processed;
    };

    return {
      fetch: sandbox.fetch,
      fetchJson,
      log,
      upsertRows
    };
  }

  private allowedDomainsForSource(type: SourceAccountType): string[] {
    switch (type) {
      case SourceAccountType.ENTRATA:
        return ["apis.entrata.com"];
      case SourceAccountType.GA4:
        return ["analyticsdata.googleapis.com"];
      case SourceAccountType.GOOGLE_ADS:
        return ["googleads.googleapis.com"];
      case SourceAccountType.GBP:
        return ["mybusiness.googleapis.com"];
      default:
        return [];
    }
  }

  private async persistRows(table: string, rows: unknown[], propertyId: string, runId: string) {
    switch (table) {
      case "leads":
        return this.persistLeads(rows, propertyId);
      case "leadEvents":
      case "lead_events":
        return this.persistLeadEvents(rows, propertyId);
      case "applications":
        return this.persistApplications(rows, propertyId);
      case "leases":
        return this.persistLeases(rows, propertyId);
      case "conversionEvents":
      case "conversion_events":
        return this.persistConversionEvents(rows, propertyId, runId);
      case "channelSpend":
      case "channel_spend":
        return this.persistChannelSpend(rows, propertyId, runId);
      case "reviews":
        return this.persistReviews(rows, propertyId, runId);
      default:
        throw new Error(`Unsupported table '${table}'. Allowed tables: leads, leadEvents, applications, leases, conversionEvents, channelSpend, reviews.`);
    }
  }

  private async persistLeads(rows: unknown[], _propertyId: string) {
    const propertyId = _propertyId;
    let processed = 0;
    for (const row of rows) {
      const record = this.ensureRecord(row, "lead");
      const externalId = this.ensureString(record.externalId, "lead.externalId");
      const source = this.optionalString(record.source) ?? "Custom";
      const createdAt = this.parseOptionalDate(record.createdAt, "lead.createdAt");
      // const cost = this.toDecimal(record.cost, "lead.cost");

      const updateData: Prisma.LeadUpdateInput = {
        source
      };
      // if (cost !== undefined) {
      //   updateData.cost = cost;
      // }
      const gclid = this.optionalString(record.gclid);
      if (gclid !== undefined) {
        updateData.gclid = gclid;
      }
      const gbraid = this.optionalString(record.gbraid);
      if (gbraid !== undefined) {
        updateData.gbraid = gbraid;
      }
      const wbraid = this.optionalString(record.wbraid);
      if (wbraid !== undefined) {
        updateData.wbraid = wbraid;
      }

      const createData: Prisma.LeadCreateInput = {
        property: { connect: { id: propertyId } },
        externalId,
        source,
        createdAt: createdAt ?? new Date()
      };
      // if (cost !== undefined) {
      //   createData.cost = cost;
      // }
      if (gclid !== undefined) {
        createData.gclid = gclid;
      }
      if (gbraid !== undefined) {
        createData.gbraid = gbraid;
      }
      if (wbraid !== undefined) {
        createData.wbraid = wbraid;
      }

      const where: Prisma.LeadWhereUniqueInput = {
        propertyId_externalId: {
          propertyId: propertyId,
          externalId
        }
      };

      await this.prisma.lead.upsert({
        where,
        update: updateData,
        create: createData
      });
      processed += 1;
    }
    return processed;
  }

  private async persistLeadEvents(rows: unknown[], propertyId: string) {
    let processed = 0;
    for (const row of rows) {
      const record = this.ensureRecord(row, "leadEvent");
      const id = this.optionalString(record.id) ?? this.deterministicId("leadEvent", propertyId, record.leadId, record.leadExternalId, record.type, record.occurredAt);
      const type = this.ensureString(record.type, "leadEvent.type");
      const occurredAt = this.parseDate(record.occurredAt ?? record.occurred_at ?? record.timestamp, "leadEvent.occurredAt");
      const meta = record.meta !== undefined ? this.asJson(record.meta) : undefined;

      const leadId = await this.resolveLeadId(propertyId, record);

      await this.prisma.leadEvent.upsert({
        where: { id },
        update: {
          leadId,
          type,
          occurredAt,
          ...(meta !== undefined ? { meta } : {})
        },
        create: {
          id,
          leadId,
          propertyId,
          type,
          occurredAt,
          ...(meta !== undefined ? { meta } : {})
        }
      });
      processed += 1;
    }
    return processed;
  }

  private async persistApplications(rows: unknown[], propertyId: string) {
    let processed = 0;
    for (const row of rows) {
      const record = this.ensureRecord(row, "application");
      const leadId = await this.resolveLeadId(propertyId, record);
      const status = this.parseEnum(ApplicationStatus, record.status, "application.status");
      const submittedAt = this.parseDate(record.submittedAt ?? record.submitted_at, "application.submittedAt");
      const approvedAt = this.parseOptionalDate(record.approvedAt ?? record.approved_at, "application.approvedAt");

      await this.prisma.application.upsert({
        where: { leadId },
        update: {
          status,
          submittedAt,
          approvedAt: approvedAt ?? null
        },
        create: {
          propertyId,
          leadId,
          status,
          submittedAt,
          ...(approvedAt ? { approvedAt } : {})
        }
      });
      processed += 1;
    }
    return processed;
  }

  private async persistLeases(rows: unknown[], propertyId: string) {
    let processed = 0;
    for (const row of rows) {
      const record = this.ensureRecord(row, "lease");
      const leadId = await this.resolveLeadId(propertyId, record);
      const status = this.parseEnum(LeaseStatus, record.status, "lease.status");
      const startDate = this.parseDate(record.startDate ?? record.start_date, "lease.startDate");
      const endDate = this.parseOptionalDate(record.endDate ?? record.end_date, "lease.endDate");
      const moveOutAt = this.parseOptionalDate(record.moveOutAt ?? record.move_out_at, "lease.moveOutAt");
      const unitId = this.optionalString(record.unitId ?? record.unit_id);
      const applicationId = this.optionalString(record.applicationId ?? record.application_id);

      await this.prisma.lease.upsert({
        where: { leadId },
        update: {
          status,
          startDate,
          endDate: endDate ?? null,
          moveOutAt: moveOutAt ?? null,
          unitId: unitId ?? null,
          applicationId: applicationId ?? null
        },
        create: {
          propertyId,
          leadId,
          status,
          startDate,
          ...(endDate ? { endDate } : {}),
          ...(moveOutAt ? { moveOutAt } : {}),
          ...(unitId ? { unitId } : {}),
          ...(applicationId ? { applicationId } : {})
        }
      });
      processed += 1;
    }
    return processed;
  }

  private async persistConversionEvents(rows: unknown[], propertyId: string, runId: string) {
    let processed = 0;
    for (const row of rows) {
      const record = this.ensureRecord(row, "conversionEvent");
      const id = this.optionalString(record.id) ?? this.deterministicId("conversion", propertyId, record.type, record.day, runId, processed);
      const type = this.ensureString(record.type, "conversionEvent.type");
      const day = this.parseDate(record.day ?? record.date, "conversionEvent.day");
      const count = this.parseInteger(record.count ?? record.value, "conversionEvent.count");
      const leadId = record.leadId ? this.optionalString(record.leadId) : undefined;
      const leadExternalId = this.optionalString(record.leadExternalId ?? record.lead_external_id);
      const resolvedLeadId = leadId ?? (leadExternalId ? await this.lookupLeadId(propertyId, leadExternalId) : undefined);
      const gclid = this.optionalString(record.gclid);
      const gbraid = this.optionalString(record.gbraid);
      const wbraid = this.optionalString(record.wbraid);

      await this.prisma.conversionEvent.upsert({
        where: { id },
        update: {
          type,
          day,
          count,
          leadId: resolvedLeadId ?? null,
          gclid: gclid ?? null,
          gbraid: gbraid ?? null,
          wbraid: wbraid ?? null
        },
        create: {
          id,
          propertyId,
          type,
          day,
          count,
          ...(resolvedLeadId ? { leadId: resolvedLeadId } : {}),
          ...(gclid ? { gclid } : {}),
          ...(gbraid ? { gbraid } : {}),
          ...(wbraid ? { wbraid } : {})
        }
      });
      processed += 1;
    }
    return processed;
  }

  private async persistChannelSpend(rows: unknown[], propertyId: string, runId: string) {
    let processed = 0;
    for (const row of rows) {
      const record = this.ensureRecord(row, "channelSpend");
      const id = this.optionalString(record.id) ?? this.deterministicId("channelSpend", propertyId, record.channel, record.day, runId, processed);
      const channel = this.ensureString(record.channel, "channelSpend.channel");
      const day = this.parseDate(record.day ?? record.date, "channelSpend.day");
      const campaignId = this.optionalString(record.campaignId ?? record.campaign_id);
      const cost = this.toDecimal(record.cost, "channelSpend.cost");
      if (cost === undefined) {
        throw new Error("channelSpend.cost is required");
      }
      const currency = this.optionalString(record.currency);

      await this.prisma.channelSpend.upsert({
        where: { id },
        update: {
          channel,
          day,
          campaignId: campaignId ?? null,
          cost,
          currency: currency ?? "USD"
        },
        create: {
          id,
          propertyId,
          channel,
          day,
          cost,
          ...(campaignId ? { campaignId } : {}),
          ...(currency ? { currency } : {})
        }
      });
      processed += 1;
    }
    return processed;
  }

  private async persistReviews(rows: unknown[], propertyId: string, runId: string) {
    let processed = 0;
    for (const row of rows) {
      const record = this.ensureRecord(row, "review");
      const id = this.optionalString(record.id) ?? this.deterministicId("review", propertyId, record.at, record.authorName ?? record.author ?? record.text, runId, processed);
      const rating = this.parseInteger(record.rating, "review.rating");
      const text = this.ensureString(record.text ?? record.body, "review.text");
      const at = this.parseDate(record.at ?? record.timestamp, "review.at");
      const provider = record.provider ? this.parseEnum(ReviewProvider, record.provider, "review.provider") : ReviewProvider.GBP;
      const authorName = this.optionalString(record.authorName ?? record.author);
      const reviewerEmail = this.optionalString(record.reviewerEmail ?? record.email);
      const reviewerPhoto = this.optionalString(record.reviewerPhoto ?? record.photoUrl);
      const responseText = this.optionalString(record.responseText ?? record.response_text);
      const respondedAt = this.parseOptionalDate(record.respondedAt ?? record.responded_at, "review.respondedAt");
      const rawPayload = record.rawPayload !== undefined ? this.asJson(record.rawPayload) : undefined;

      await this.prisma.review.upsert({
        where: { id },
        update: {
          provider,
          rating,
          text,
          at,
          authorName: authorName ?? null,
          reviewerEmail: reviewerEmail ?? null,
          reviewerPhoto: reviewerPhoto ?? null,
          responseText: responseText ?? null,
          respondedAt: respondedAt ?? null,
          ...(rawPayload !== undefined ? { rawPayload } : {})
        },
        create: {
          id,
          propertyId,
          provider,
          rating,
          text,
          at,
          ...(authorName ? { authorName } : {}),
          ...(reviewerEmail ? { reviewerEmail } : {}),
          ...(reviewerPhoto ? { reviewerPhoto } : {}),
          ...(responseText ? { responseText } : {}),
          ...(respondedAt ? { respondedAt } : {}),
          ...(rawPayload !== undefined ? { rawPayload } : {})
        }
      });
      processed += 1;
    }
    return processed;
  }

  private ensureRecord(value: unknown, context: string): Record<string, unknown> {
    if (!value || typeof value !== "object") {
      throw new Error(`${context} row must be an object`);
    }
    return value as Record<string, unknown>;
  }

  private ensureString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${field} must be a non-empty string`);
    }
    return value.trim();
  }

  private optionalString(value: unknown): string | undefined {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return undefined;
  }

  private parseDate(value: unknown, field: string): Date {
    const date = this.parseOptionalDate(value, field);
    if (!date) {
      throw new Error(`${field} is required and must be a valid date or ISO string`);
    }
    return date;
  }

  private parseOptionalDate(value: unknown, field: string): Date | undefined {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new Error(`${field} is not a valid date`);
      }
      return value;
    }
    if (typeof value === "string") {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`${field} is not a valid ISO date string`);
      }
      return date;
    }
    if (typeof value === "number") {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`${field} is not a valid timestamp`);
      }
      return date;
    }
    throw new Error(`${field} must be a Date, ISO string, or timestamp`);
  }

  private parseEnum<T extends Record<string, string>>(enumObject: T, value: unknown, field: string): T[keyof T] {
    if (typeof value !== "string") {
      throw new Error(`${field} must be a string`);
    }
    const normalized = value.toUpperCase();
    const match = Object.values(enumObject).find((item) => item.toUpperCase() === normalized);
    if (!match) {
      throw new Error(`${field} must be one of: ${Object.values(enumObject).join(", ")}`);
    }
    return match as T[keyof T];
  }

  private parseInteger(value: unknown, field: string): number {
    if (value === undefined || value === null) {
      throw new Error(`${field} is required`);
    }
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`${field} must be a finite number`);
    }
    return Math.trunc(parsed);
  }

  private toDecimal(value: unknown, field: string): Prisma.Decimal | undefined {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) {
      throw new Error(`${field} must be a finite number`);
    }
    return new Prisma.Decimal(numeric);
  }

  private async resolveLeadId(propertyId: string, record: Record<string, unknown>) {
    const explicitLeadId = this.optionalString(record.leadId ?? record.lead_id);
    if (explicitLeadId) {
      return explicitLeadId;
    }
    const leadExternalId = this.ensureString(record.leadExternalId ?? record.lead_external_id, "lead.leadExternalId");
    const lead = await this.prisma.lead.findUnique({
      where: {
        propertyId_externalId: {
          propertyId,
          externalId: leadExternalId
        }
      }
    });
    if (!lead) {
      throw new Error(`Lead with externalId ${leadExternalId} not found for property ${propertyId}`);
    }
    return lead.id;
  }

  private async lookupLeadId(propertyId: string, externalId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: {
        propertyId_externalId: {
          propertyId,
          externalId
        }
      }
    });
    return lead?.id;
  }

  private deterministicId(...parts: unknown[]) {
    const hash = createHash("sha256");
    for (const part of parts) {
      hash.update(String(part ?? ""));
      hash.update("|");
    }
    return hash.digest("hex").slice(0, 32);
  }

  private wrapScriptError(error: unknown, logs: string[]): never {
    if (error instanceof BadRequestException) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    const sanitizedLogs = logs.map((line) => String(redactSensitive(line)));
    throw new BadRequestException({ message, logs: sanitizedLogs });
  }

  private instantiateModule(code: string, consoleOverride?: SandboxResult["console"]): ProviderModuleExports {
    const moduleReference = { exports: {} as ProviderModuleExports };
    const sandbox: Record<string, unknown> = {
      module: moduleReference,
      exports: moduleReference.exports,
      console: consoleOverride ?? console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      require: () => {
        throw new Error("require is not available in the provider sandbox");
      },
      process: undefined,
      global: undefined,
      globalThis: undefined
    };

    const vm = new VM({
      timeout: EXECUTION_TIMEOUT_MS,
      sandbox,
      eval: false,
      wasm: false
    });

    vm.run(code, "provider-script.js");
    return moduleReference.exports;
  }

  private async compileScript(code: string) {
    const result = await transform(code, {
      loader: "ts",
      format: "cjs",
      target: "es2020",
      platform: "node"
    });
    return result.code;
  }

  private async runWithTimeout<T>(promise: Promise<T> | T, timeoutMs: number): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Script execution timed out"));
      }, timeoutMs);

      Promise.resolve(promise)
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private decryptCredential(value: unknown): Record<string, unknown> {
    return this.credentialCipher.decrypt(value);
  }

  private redactLogEntry(entry: SourceActionLogEntry) {
    const sanitizedRequest = entry.request === null ? null : this.asJson(redactSensitive(entry.request));
    const sanitizedResponse = entry.response === null ? null : this.asJson(redactSensitive(entry.response));
    return {
      ...entry,
      request: sanitizedRequest,
      response: sanitizedResponse
    };
  }

  private asJson(value: unknown): Prisma.InputJsonValue {
    if (value === undefined || value === null) {
      return JSON_NULL;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }

    try {
      return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    } catch {
      return String(value) as Prisma.InputJsonValue;
    }
  }

  private stringifyLog(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private resolveUrl(input: Parameters<typeof fetch>[0]): string {
    if (typeof input === "string") {
      return input;
    }
    if (input instanceof URL) {
      return input.toString();
    }
    if (typeof input === "object" && input && "url" in input) {
      const possibleUrl = (input as { url?: string }).url;
      if (possibleUrl) {
        return possibleUrl;
      }
    }

    throw new Error("Unsupported fetch input type");
  }

  private ensureDevMocksEnabled() {
    if (!this.devMocksEnabled) {
      throw new ServiceUnavailableException(
        "Provider studio mocks are disabled. Set DEV_MOCKS=true to enable developer mock data."
      );
    }
  }
}
