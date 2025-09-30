import { Module } from "@nestjs/common";

import { ProvidersModule } from "../providers/providers.module";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";

@Module({
  imports: [ProvidersModule],
  controllers: [MetricsController],
  providers: [MetricsService]
})
export class MetricsModule {}
