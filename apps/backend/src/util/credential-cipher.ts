import type { Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import { JSON_NULL } from "./json";

interface CredentialCipherOptions {
  key?: string | null;
  logger?: Logger;
  context?: string;
}

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export class CredentialCipher {
  private readonly key?: Buffer;
  private readonly logger?: Logger;
  private readonly contextLabel: string;

  constructor(options: CredentialCipherOptions) {
    const raw = options.key?.trim();
    this.logger = options.logger;
    this.contextLabel = options.context ?? "Credential";

    if (raw && raw.length > 0) {
      this.key = createHash("sha256").update(raw).digest();
    } else if (this.logger) {
      this.logger.warn(
        `${this.contextLabel} encryption key not configured. Values will be stored unencrypted. Configure ENCRYPTION_KEY in production environments.`
      );
    }
  }

  encrypt(value: Record<string, unknown>): Prisma.InputJsonValue {
    if (!this.key) {
      return this.toJson(value);
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const payload = JSON.stringify(value ?? {});
    const ciphertext = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const packed = Buffer.concat([iv, authTag, ciphertext]).toString("base64");
    return { enc: packed } as Prisma.JsonObject;
  }

  decrypt(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object") {
      return {};
    }

    if ("enc" in (value as Record<string, unknown>)) {
      const encoded = (value as Record<string, unknown>).enc;
      if (!this.key || typeof encoded !== "string" || encoded.length === 0) {
        return {};
      }

      try {
        const raw = Buffer.from(encoded, "base64");
        const iv = raw.subarray(0, IV_LENGTH);
        const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

        const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
        return JSON.parse(decrypted) as Record<string, unknown>;
      } catch (error) {
        this.logger?.error(
          `${this.contextLabel} decryption failed: ${(error as Error).message}`,
          error as Error
        );
        return {};
      }
    }

    return this.clone(value) as Record<string, unknown>;
  }

  toJson(value: unknown): Prisma.InputJsonValue {
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

  private clone<T>(value: T): T {
    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      return value;
    }
  }
}

export function buildCredentialCipher(logger: Logger, key?: string | null, context?: string) {
  return new CredentialCipher({ key, logger, context });
}
