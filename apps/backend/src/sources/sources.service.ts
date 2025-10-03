import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, SourceAccountType } from "@prisma/client";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import { CreateSourceDto, CredentialPayload, SourceTypeDto, UpdateSourceDto } from "./sources.dto";
import { configureEtlProcessor, processEtlJob } from "../jobs/etl.processor";
import { JobsService } from "../jobs/jobs.service";
import { PrismaService } from "../prisma/prisma.service";
import { EntrataProvider } from "../providers/entrata.provider";
import { Ga4Provider } from "../providers/ga4.provider";
import { GoogleBusinessProvider } from "../providers/gbp.provider";
import { GoogleAdsProvider } from "../providers/google-ads.provider";

export type SourceStatus = "CONNECTED" | "ERROR" | "UNVERIFIED";

interface ProviderValidationResult {
  ok: boolean;
  message?: string;
}

interface SourceSummary {
  id: string;
  name?: string | null;
  propertyId?: string;
  type: SourceTypeDto;
  status: SourceStatus;
  lastSuccessAt?: string | null;
  lastErrorAt?: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  validationMessage?: string;
}

const DTO_TO_PRISMA: Record<SourceTypeDto, SourceAccountType> = {
  [SourceTypeDto.ENTRATA]: SourceAccountType.ENTRATA,
  [SourceTypeDto.GA4]: SourceAccountType.GA4,
  [SourceTypeDto.ADS]: SourceAccountType.GOOGLE_ADS,
  [SourceTypeDto.GBP]: SourceAccountType.GBP
};

const PRISMA_TO_DTO: Record<SourceAccountType, SourceTypeDto | undefined> = {
  [SourceAccountType.ENTRATA]: SourceTypeDto.ENTRATA,
  [SourceAccountType.GA4]: SourceTypeDto.GA4,
  [SourceAccountType.GBP]: SourceTypeDto.GBP,
  [SourceAccountType.GOOGLE_ADS]: SourceTypeDto.ADS,
  [SourceAccountType.WORDPRESS]: undefined
};

const MOCK_SOURCES: SourceSummary[] = [
  {
    id: "mock-entrata",
    name: "Entrata demo property",
    propertyId: "prop-atrium",
    type: SourceTypeDto.ENTRATA,
    status: "CONNECTED",
    lastSuccessAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    lastErrorAt: null,
    enabled: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
  },
  {
    id: "mock-ga4",
    name: "GA4 demo property",
    propertyId: "prop-harbor",
    type: SourceTypeDto.GA4,
    status: "UNVERIFIED",
    lastSuccessAt: null,
    lastErrorAt: null,
    enabled: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString()
  },
  {
    id: "mock-ads",
    name: "Google Ads sandbox",
    propertyId: "prop-quartz",
    type: SourceTypeDto.ADS,
    status: "ERROR",
    lastSuccessAt: null,
    lastErrorAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    enabled: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  }
];

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);
  private readonly encryptionKey?: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService,
    private readonly entrataProvider: EntrataProvider,
    private readonly ga4Provider: Ga4Provider,
    private readonly googleAdsProvider: GoogleAdsProvider,
    private readonly gbpProvider: GoogleBusinessProvider
  ) {
    const configuredKey = this.configService.get<string>("ENCRYPTION_KEY") ?? process.env.ENCRYPTION_KEY;
    if (configuredKey && configuredKey.trim().length > 0) {
      this.encryptionKey = createHash("sha256").update(configuredKey).digest();
    } else {
      this.logger.warn(
        "ENCRYPTION_KEY not configured. Source credentials will be stored unencrypted. Configure this in production environments."
      );
    }

    configureEtlProcessor({
      prisma: this.prisma,
      decrypt: (value) => this.decryptCredential(value),
      providers: {
        entrata: this.entrataProvider,
        ga4: this.ga4Provider,
        ads: this.googleAdsProvider,
        gbp: this.gbpProvider
      },
      logger: new Logger("EtlProcessor")
    });
  }

  async list(useMockFallback: boolean) {
    try {
      const sources = await this.prisma.sourceAccount.findMany({
        orderBy: { createdAt: "asc" }
      });

      if (sources.length === 0 && useMockFallback) {
        return { sources: MOCK_SOURCES };
      }

      return { sources: sources.map((source) => this.toSummary(source)) };
    } catch (error) {
      this.logger.error("Unable to load sources", error as Error);
      if (useMockFallback) {
        return { sources: MOCK_SOURCES };
      }
      throw error;
    }
  }

  async create(dto: CreateSourceDto & { credential: CredentialPayload }) {
    const prismaType = DTO_TO_PRISMA[dto.type];
    if (!prismaType) {
      throw new Error(`Unsupported source type: ${dto.type}`);
    }

    const now = new Date();
    const source = await this.prisma.sourceAccount.create({
      data: {
        propertyId: dto.propertyId,
        type: prismaType,
        name: dto.name,
        credential: this.encryptCredential(dto.credential),
        enabled: dto.enabled ?? true,
        status: "UNVERIFIED",
        lastSuccessAt: null,
        lastErrorAt: null,
        createdAt: now,
        updatedAt: now
      }
    });

    const result = await this.validateAndUpdate(source.id);
    return {
      source: this.toSummary(result.source),
      validationMessage: result.validation.message
    };
  }

  async update(id: string, dto: UpdateSourceDto & { credential?: CredentialPayload }) {
    const data: Prisma.SourceAccountUpdateInput = {};

    if (dto.propertyId) {
      data.property = { connect: { id: dto.propertyId } };
    }
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.enabled !== undefined) {
      data.enabled = dto.enabled;
    }
    if (dto.credential) {
      data.credential = this.encryptCredential(dto.credential);
    }

    const updated = await this.prisma.sourceAccount.update({
      where: { id },
      data
    });

    const result = await this.validateAndUpdate(updated.id);
    return {
      source: this.toSummary(result.source),
      validationMessage: result.validation.message
    };
  }

  async remove(id: string) {
    await this.prisma.sourceAccount.delete({ where: { id } });
    return { ok: true };
  }

  async run(id: string) {
    const queued = await this.jobsService.enqueueEtlRun(id, "manual-sync");
    if (queued) {
      return { ok: true, mode: "queued" };
    }

    await processEtlJob({ sourceId: id, job: "manual-sync" });
    return { ok: true, mode: "immediate" };
  }

  private encryptCredential(credential: CredentialPayload): Prisma.JsonValue {
    if (!this.encryptionKey) {
      return credential as Prisma.JsonObject;
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    const payload = JSON.stringify(credential);
    const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const packed = Buffer.concat([iv, authTag, encrypted]).toString("base64");
    return { enc: packed };
  }

  private decryptCredential(value: unknown): CredentialPayload {
    if (!value || typeof value !== "object") {
      return {};
    }

    if ("enc" in (value as Record<string, unknown>)) {
      const encrypted = (value as Record<string, string>).enc;
      if (!this.encryptionKey || !encrypted) {
        return {};
      }

      const raw = Buffer.from(encrypted, "base64");
      const iv = raw.subarray(0, 12);
      const authTag = raw.subarray(12, 28);
      const ciphertext = raw.subarray(28);

      const decipher = createDecipheriv("aes-256-gcm", this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
      try {
        return JSON.parse(decrypted) as CredentialPayload;
      } catch (error) {
        this.logger.error("Failed to parse decrypted credential", error as Error);
        return {};
      }
    }

    return value as CredentialPayload;
  }

  private async validateAndUpdate(id: string) {
    const source = await this.prisma.sourceAccount.findUniqueOrThrow({ where: { id } });
    const validation = await this.validate(source);
    const now = new Date();

    const data: Prisma.SourceAccountUpdateInput = {
      status: validation.ok ? "CONNECTED" : "ERROR",
      lastSuccessAt: validation.ok ? now : source.lastSuccessAt,
      lastErrorAt: validation.ok ? source.lastErrorAt : now
    };

    const updated = await this.prisma.sourceAccount.update({ where: { id }, data });
    return { source: updated, validation };
  }

  private async validate(source: Prisma.SourceAccount): Promise<ProviderValidationResult> {
    const credential = this.decryptCredential(source.credential);

    try {
      switch (source.type) {
        case SourceAccountType.ENTRATA:
          return this.wrapValidationResult(await this.entrataProvider.validate(credential));
        case SourceAccountType.GA4:
          return this.wrapValidationResult(await this.ga4Provider.validate(credential));
        case SourceAccountType.GOOGLE_ADS:
          return this.wrapValidationResult(await this.googleAdsProvider.validate(credential));
        case SourceAccountType.GBP:
          return this.wrapValidationResult(await this.gbpProvider.validate(credential));
        default:
          return { ok: false, message: `Validation not implemented for ${source.type}` };
      }
    } catch (error) {
      this.logger.error(`Validation failed for source ${source.id}`, error as Error);
      return { ok: false, message: (error as Error).message };
    }
  }

  private wrapValidationResult(result: boolean | ProviderValidationResult): ProviderValidationResult {
    if (typeof result === "boolean") {
      return { ok: result };
    }
    return result;
  }

  private toSummary(source: Prisma.SourceAccount): SourceSummary {
    const type = PRISMA_TO_DTO[source.type];
    if (!type) {
      throw new Error(`Cannot map source type ${source.type}`);
    }

    return {
      id: source.id,
      name: source.name,
      propertyId: source.propertyId,
      type,
      status: (source.status as SourceStatus) ?? "UNVERIFIED",
      lastSuccessAt: source.lastSuccessAt ? source.lastSuccessAt.toISOString() : null,
      lastErrorAt: source.lastErrorAt ? source.lastErrorAt.toISOString() : null,
      enabled: source.enabled ?? true,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString()
    };
  }
}
