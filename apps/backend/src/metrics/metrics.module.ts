import { Module } from "@nestjs/common";

import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";
import { ProvidersModule } from "../providers/providers.module";

@Module({
  imports: [ProvidersModule],
  controllers: [MetricsController],
  providers: [MetricsService]
})
export class MetricsModule {}
