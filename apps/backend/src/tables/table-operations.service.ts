import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { PrismaService } from "../prisma/prisma.service";

type DbClient = PrismaService | Prisma.TransactionClient;

interface OperationRow {
  status: string;
  result_json: unknown | null;
  error_message: string | null;
}

@Injectable()
export class TableOperationsService {
  private infrastructureReady?: Promise<void>;

  constructor(private readonly prisma: PrismaService) {}

  async createTable(name: string, description?: string) {
    await this.ensureInfrastructure();

    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new BadRequestException("name is required");
    }

    const duplicateCheck = await this.prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(SELECT 1 FROM app.tables WHERE LOWER(name) = LOWER(${normalizedName})) AS "exists"
    `;

    if (duplicateCheck[0]?.exists) {
      throw new ConflictException("A table with that name already exists");
    }

    const opId = randomUUID();
    const sanitizedDescription = description?.trim() || null;

    await this.prisma.$executeRaw`
      INSERT INTO app.ops (id, type, status, payload_json, created_at, updated_at)
      VALUES (${opId}::uuid, ${"table.create"}, ${"pending"}, ${JSON.stringify({
        name: normalizedName,
        description: sanitizedDescription
      })}::jsonb, NOW(), NOW())
    `;

    try {
      const tableId = await this.prisma.$transaction(async (tx) => {
        const slug = await this.generateUniqueSlug(tx, normalizedName);
        const tableName = `tbl_${slug}`;
        const newTableId = randomUUID();

        await tx.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS app.${tableName} (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await tx.$executeRaw`
          INSERT INTO app.tables (id, name, slug, description, schema_json, created_at, updated_at)
          VALUES (
            ${newTableId}::uuid,
            ${normalizedName},
            ${slug},
            ${sanitizedDescription},
            ${JSON.stringify({ columns: [] })}::jsonb,
            NOW(),
            NOW()
          )
        `;

        await tx.$executeRaw`
          UPDATE app.ops
          SET status = ${"done"}, result_json = ${JSON.stringify({ tableId: newTableId })}::jsonb, error_message = NULL, updated_at = NOW()
          WHERE id = ${opId}::uuid
        `;

        return newTableId;
      });

      return { opId, tableId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      await this.prisma.$executeRaw`
        UPDATE app.ops
        SET status = ${"error"}, result_json = NULL, error_message = ${message}, updated_at = NOW()
        WHERE id = ${opId}::uuid
      `;

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("A table with that name already exists");
      }

      if (message.includes("duplicate")) {
        throw new ConflictException("A table with that name already exists");
      }

      throw new InternalServerErrorException("Failed to create table");
    }
  }

  async getOperation(id: string) {
    await this.ensureInfrastructure();

    const rows = await this.prisma.$queryRaw<OperationRow[]>`
      SELECT status, result_json, error_message FROM app.ops WHERE id = ${id}::uuid
    `;

    if (!rows.length) {
      throw new NotFoundException("Operation not found");
    }

    const record = rows[0];
    return {
      status: record.status,
      result: record.result_json ?? null,
      error: record.error_message ?? null
    };
  }

  private async ensureInfrastructure() {
    if (!this.infrastructureReady) {
      this.infrastructureReady = this.prisma
        .$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
          await tx.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS app`);
          await tx.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS app.ops (
              id UUID PRIMARY KEY,
              type TEXT NOT NULL,
              status TEXT NOT NULL,
              payload_json JSONB,
              result_json JSONB,
              error_message TEXT,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
          `);
          await tx.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS app.tables (
              id UUID PRIMARY KEY,
              name TEXT NOT NULL,
              slug TEXT NOT NULL UNIQUE,
              description TEXT,
              schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
          `);
        })
        .catch((error) => {
          this.infrastructureReady = undefined;
          throw error;
        });
    }

    await this.infrastructureReady;
  }

  private async generateUniqueSlug(client: DbClient, name: string) {
    const baseSlug = this.slugify(name);
    let attempt = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const candidate = attempt === 0 ? baseSlug : `${baseSlug}_${attempt}`;
      const existing = await client.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS(SELECT 1 FROM app.tables WHERE slug = ${candidate}) AS "exists"
      `;

      if (!existing[0]?.exists) {
        return candidate;
      }

      attempt += 1;
    }
  }

  private slugify(value: string) {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48);

    if (normalized.length > 0) {
      return normalized;
    }

    return `table_${Date.now()}`;
  }
}
