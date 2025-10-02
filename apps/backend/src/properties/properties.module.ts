import { Module } from "@nestjs/common";

import { ProvidersModule } from "../providers/providers.module";
import { PropertiesController } from "./properties.controller";
import { PropertiesService } from "./properties.service";

@Module({
  imports: [ProvidersModule],
  controllers: [PropertiesController],
  providers: [PropertiesService]
})
export class PropertiesModule {}
