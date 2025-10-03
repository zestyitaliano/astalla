import { Module } from "@nestjs/common";

import { AlertsController } from "./alerts.controller";
import { AlertsService } from "./alerts.service";
import { ProvidersModule } from "../providers/providers.module";

@Module({
  imports: [ProvidersModule],
  controllers: [AlertsController],
  providers: [AlertsService]
})
export class AlertsModule {}
