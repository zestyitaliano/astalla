import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, ScriptStatus, SourceAccountType } from "@prisma/client";
import { transform } from "esbuild";
import { VM } from "vm2";
import { createDecipheriv, createHash } from "crypto";

import type { ProviderManifest } from "@shared/api";
import { ProviderManifest as ProviderManifestSchema } from "@shared/api";

import { PrismaService } from "../prisma/prisma.service";

const EXECUTION_TIMEOUT_MS = 5_000;
const RESPONSE_SIZE_LIMIT = 10 * 1024 * 1024;
const REQUEST_COOLDOWN_MS = 1_000;

type ProviderModuleExports = {
  manifest?: ProviderManifest;
  validate?: (creds: Record<string, unknown>, ctx: ProviderExecutionContext) => unknown | Promise<unknown>;
  actions?: Record<string, ProviderActionHandler>;
};

type ProviderActionHandler = (
  creds: Record<string, unknown>,
  params: unknown,
  ctx: ProviderExecutionContext
) => unknown | Promise<unknown>;

interface ProviderExecutionContext {
  fetch: typeof fetch;
}

interface SandboxResult {
  fetch: typeof fetch;
  console: {
    log: (...args: unknown[]) => void;
  };
  logs: string[];
}

@Injectable()
export class DevProvidersService {
  private readonly logger = new Logger(DevProvidersService.name);
  private readonly encryptionKey?: Buffer;

  constructor(private readonly prisma: PrismaService, private readonly configService: ConfigService) {
    const configuredKey = this.configService.get<string>("ENCRYPTION_KEY") ?? process.env.ENCRYPTION_KEY;
    if (configuredKey && configuredKey.trim().length > 0) {
      this.encryptionKey = createHash("sha256").update(configuredKey).digest();
    }
  }

  async getScriptBySource(sourceId: string) {
    const script = await this.prisma.providerScript.findUnique({ where: { sourceId } });
    if (!script) {
      return { code: "", status: ScriptStatus.DRAFT, version: 1, manifest: null };
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
      status: script.status,
      version: script.version,
      manifest
    };
  }

  async saveDraft(sourceId: string, code: string, createdBy?: string) {
    const existing = await this.prisma.providerScript.findUnique({ where: { sourceId } });
    const nextVersion = existing ? (existing.code === code ? existing.version : existing.version + 1) : 1;

    const saved = await this.prisma.providerScript.upsert({
      where: { sourceId },
      update: { code, status: ScriptStatus.DRAFT, version: nextVersion },
      create: { sourceId, code, status: ScriptStatus.DRAFT, version: 1, createdBy }
    });

    return {
      code: saved.code,
      status: saved.status,
      version: saved.version
    };
  }

  async publish(sourceId: string, publishedBy?: string) {
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
    const ctx: ProviderExecutionContext = { fetch: sandbox.fetch };

    const started = Date.now();
    try {
      const result = await this.runWithTimeout(module.validate(credential, ctx), EXECUTION_TIMEOUT_MS);
      return {
        ok: true,
        result,
        latencyMs: Date.now() - started,
        logs: sandbox.logs
      };
    } catch (error) {
      this.logger.warn(`Validation failed for ${sourceId}: ${(error as Error).message}`);
      throw error;
    }
  }

  async runAction(sourceId: string, actionKey: string, params: unknown, createdBy?: string) {
    const { source, script } = await this.loadSourceAndScript(sourceId, true);
    if (!script) {
      throw new NotFoundException("No script available");
    }

    const compiled = await this.compileScript(script.code);
    const sandbox = this.makeSandbox(source.type);
    const module = this.instantiateModule(compiled, sandbox.console);

    if (!module.actions || typeof module.actions[actionKey] !== "function") {
      throw new BadRequestException(`Action ${actionKey} not found in script`);
    }

    const handler = module.actions[actionKey] as ProviderActionHandler;
    const credential = this.decryptCredential(source.credential);
    const ctx: ProviderExecutionContext = { fetch: sandbox.fetch };

    const started = Date.now();
    let ok = false;
    let responseJson: Prisma.InputJsonValue | undefined;
    let errorMessage: string | undefined;

    try {
      const rawResult = await this.runWithTimeout(handler(credential, params, ctx), EXECUTION_TIMEOUT_MS);
      ok = true;
      responseJson = this.asJson({ result: rawResult, logs: sandbox.logs });
      return {
        ok: true,
        result: rawResult,
        logs: sandbox.logs,
        latencyMs: Date.now() - started
      };
    } catch (error) {
      errorMessage = (error as Error).message;
      responseJson = this.asJson({ logs: sandbox.logs });
      throw error;
    } finally {
      await this.prisma.sourceActionLog.create({
        data: {
          sourceId,
          action: actionKey,
          ok,
          latencyMs: ok ? Date.now() - started : null,
          request: this.asJson({ params }),
          response: responseJson,
          error: errorMessage,
          createdBy
        }
      });
    }
  }

  async listLogs(sourceId: string, limit?: number, cursor?: string) {
    const take = limit && Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 100) : 20;
    return this.prisma.sourceActionLog.findMany({
      where: { sourceId },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor }
          }
        : {})
    });
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

  private instantiateModule(code: string, consoleOverride?: SandboxResult["console"]): ProviderModuleExports {
    const moduleReference = { exports: {} as ProviderModuleExports };
    const sandbox: Record<string, unknown> = {
      module: moduleReference,
      exports: moduleReference.exports,
      console: consoleOverride ?? console,
      setTimeout,
      clearTimeout
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
    if (!value || typeof value !== "object") {
      return {};
    }

    if ("enc" in (value as Record<string, unknown>)) {
      if (!this.encryptionKey) {
        return {};
      }

      const encrypted = (value as Record<string, string>).enc;
      if (!encrypted) {
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
        return JSON.parse(decrypted) as Record<string, unknown>;
      } catch {
        return {};
      }
    }

    return value as Record<string, unknown>;
  }

  private asJson(value: unknown): Prisma.InputJsonValue {
    try {
      return JSON.parse(JSON.stringify(value)) as Prisma.JsonValue;
    } catch {
      return String(value);
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
}
