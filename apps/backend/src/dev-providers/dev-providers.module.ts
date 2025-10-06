import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { DevProvidersController } from "./dev-providers.controller";
import { DevProvidersService } from "./dev-providers.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [DevProvidersController],
  providers: [DevProvidersService],
  exports: [DevProvidersService]
})
export class DevProvidersModule {}
