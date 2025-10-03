import { Module } from "@nestjs/common";

import { PublicDashboardsController } from "./public-dashboards.controller";
import { PublicDashboardsService } from "./public-dashboards.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [PublicDashboardsController],
  providers: [PublicDashboardsService],
  exports: [PublicDashboardsService]
})
export class PublicDashboardsModule {}
