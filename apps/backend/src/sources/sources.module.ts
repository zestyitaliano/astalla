import { Module } from "@nestjs/common";

import { SourcesController } from "./sources.controller";
import { SourcesService } from "./sources.service";
import { JobsModule } from "../jobs/jobs.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ProvidersModule } from "../providers/providers.module";

@Module({
  imports: [PrismaModule, ProvidersModule, JobsModule],
  controllers: [SourcesController],
  providers: [SourcesService],
  exports: [SourcesService]
})
export class SourcesModule {}
