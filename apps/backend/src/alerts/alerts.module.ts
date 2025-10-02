import { Module } from "@nestjs/common";

import { ProvidersModule } from "../providers/providers.module";
import { AlertsController } from "./alerts.controller";
import { AlertsService } from "./alerts.service";

@Module({
  imports: [ProvidersModule],
  controllers: [AlertsController],
  providers: [AlertsService]
})
export class AlertsModule {}
