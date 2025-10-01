import { Module } from "@nestjs/common";

import { ProvidersModule } from "../providers/providers.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [ProvidersModule, PrismaModule],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
