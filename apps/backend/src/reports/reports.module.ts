import { Module } from "@nestjs/common";

import { ProvidersModule } from "../providers/providers.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [ProvidersModule],
  controllers: [ReportsController],
  providers: [ReportsService]
})
export class ReportsModule {}
