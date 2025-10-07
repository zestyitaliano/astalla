import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import process from "node:process";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly hasDatasource: boolean;

  constructor(private readonly configService: ConfigService) {
    const url = configService.get<string>("database.url");
    super(url
      ? {
          datasources: {
            db: {
              url
            }
          }
        }
      : {});
    this.hasDatasource = Boolean(url);
  }

  async onModuleInit() {
    if (!this.hasDatasource) {
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    if (!this.hasDatasource) {
      return;
    }
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on("beforeExit", async () => {
      await app.close();
    });
  }
}
