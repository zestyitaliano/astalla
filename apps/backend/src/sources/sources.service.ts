import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, SourceAccountType } from "@prisma/client";
import type { SourceAccount } from "@prisma/client";
import { CreateSourceDto, CredentialPayload, SourceTypeDto, UpdateSourceDto } from "./sources.dto";
import { configureEtlProcessor, processEtlJob } from "../jobs/etl.processor";
import { JobsService } from "../jobs/jobs.service";
import { PrismaService } from "../prisma/prisma.service";
import { EntrataProvider } from "../providers/entrata.provider";
import { Ga4Provider } from "../providers/ga4.provider";
import { GoogleBusinessProvider } from "../providers/gbp.provider";
import { GoogleAdsProvider } from "../providers/google-ads.provider";
import { buildCredentialCipher, CredentialCipher } from "../util/credential-cipher";

export type SourceStatus = "CONNECTED" | "ERROR" | "UNVERIFIED";

interface ProviderValidationResult {
  ok: boolean;
  message?: string;
}

export interface SourceSummary {
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
  private readonly devMocksEnabled: boolean;
  private readonly credentialCipher: CredentialCipher;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService,
    private readonly entrataProvider: EntrataProvider,
    private readonly ga4Provider: Ga4Provider,
    private readonly googleAdsProvider: GoogleAdsProvider,
    private readonly gbpProvider: GoogleBusinessProvider
  ) {
    this.devMocksEnabled = this.configService.get<boolean>("devMocks") ?? false;
    const configuredKey = this.configService.get<string>("ENCRYPTION_KEY") ?? process.env.ENCRYPTION_KEY;
    this.credentialCipher = buildCredentialCipher(this.logger, configuredKey, "Source credential");

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
        this.ensureDevMocksEnabled("Source listings");
        return { sources: MOCK_SOURCES };
      }

      return { sources: sources.map((source) => this.toSummary(source)) };
    } catch (error) {
      this.logger.error("Unable to load sources", error as Error);
      if (useMockFallback) {
        this.ensureDevMocksEnabled("Source listings");
        return { sources: MOCK_SOURCES };
      }
      throw error;
    }
  }

  async getDetail(id: string) {
    const source = await this.prisma.sourceAccount.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!source) {
      throw new NotFoundException("Source not found");
    }

    const summary = this.toSummary(source);
    const credential = this.decryptCredential(source.credential);

    return {
      ...summary,
      propertyName: source.property?.name ?? null,
      credentialSummary: this.summarizeCredential(credential)
    };
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
      const source = await this.prisma.sourceAccount.findUniqueOrThrow({ where: { id } });
      return { ok: true, mode: "queued" as const, source: this.toSummary(source) };
    }

    try {
      await processEtlJob({ sourceId: id, job: "manual-sync" });
    } catch (error) {
      const failed = await this.prisma.sourceAccount.findUnique({ where: { id } });
      if (failed) {
        throw new BadRequestException({
          message: (error as Error).message ?? "Manual sync failed",
          source: this.toSummary(failed)
        });
      }
      throw error;
    }

    const refreshed = await this.prisma.sourceAccount.findUniqueOrThrow({ where: { id } });
    return { ok: true, mode: "immediate" as const, source: this.toSummary(refreshed) };
  }

  private encryptCredential(credential: CredentialPayload): Prisma.InputJsonValue {
    return this.credentialCipher.encrypt(credential);
  }

  private decryptCredential(value: unknown): CredentialPayload {
    return this.credentialCipher.decrypt(value) as CredentialPayload;
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

  private async validate(source: SourceAccount): Promise<ProviderValidationResult> {
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

  private summarizeCredential(value: Record<string, unknown> | null | undefined) {
    if (!value) {
      return [];
    }

    return Object.entries(value).map(([key, raw]) => {
      const present =
        raw !== null &&
        raw !== undefined &&
        !(typeof raw === "string" && raw.trim().length === 0);

      let preview: string | undefined;
      if (!present) {
        preview = undefined;
      } else if (typeof raw === "string") {
        preview = "••••";
      } else if (Array.isArray(raw)) {
        preview = `${raw.length} item${raw.length === 1 ? "" : "s"}`;
      } else if (typeof raw === "number" || typeof raw === "boolean") {
        preview = typeof raw;
      } else if (typeof raw === "object") {
        preview = "object";
      } else {
        preview = "set";
      }

      return {
        key,
        present,
        preview
      };
    });
  }

  private toSummary(source: SourceAccount): SourceSummary {
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

  private ensureDevMocksEnabled(feature: string) {
    if (!this.devMocksEnabled) {
      throw new ServiceUnavailableException(
        `${feature} mocks are disabled. Set DEV_MOCKS=true to enable developer mock data.`
      );
    }
  }
}
