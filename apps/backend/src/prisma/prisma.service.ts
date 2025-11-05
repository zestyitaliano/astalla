import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * API-only; no DB access here. Provided for dependency injection compatibility.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
  }

  async onModuleInit() {
    console.warn("PrismaService initialized in API-only backend; no database connection created.");
  }

  async onModuleDestroy() {
    console.warn("PrismaService destroyed in API-only backend; no database connection to close.");
  }

  async enableShutdownHooks(_app: INestApplication) {
    console.warn(
      "PrismaService.enableShutdownHooks called in API-only backend; no shutdown hooks registered."
    );
  }
}
