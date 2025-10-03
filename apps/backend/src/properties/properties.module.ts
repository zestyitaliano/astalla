import { Module } from "@nestjs/common";

import { PropertiesController } from "./properties.controller";
import { PropertiesService } from "./properties.service";
import { ProvidersModule } from "../providers/providers.module";

@Module({
  imports: [ProvidersModule],
  controllers: [PropertiesController],
  providers: [PropertiesService]
})
export class PropertiesModule {}
