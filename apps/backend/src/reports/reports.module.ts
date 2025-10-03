import { Module } from "@nestjs/common";

import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ProvidersModule } from "../providers/providers.module";

@Module({
  imports: [ProvidersModule],
  controllers: [ReportsController],
  providers: [ReportsService]
})
export class ReportsModule {}
