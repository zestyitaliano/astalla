import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PrismaModule } from "../prisma/prisma.module";
import { ProvidersModule } from "../providers/providers.module";

@Module({
  imports: [ProvidersModule, PrismaModule],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
