import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";

import { ReferenceLookupController } from "./reference-lookup.controller";
import { ReferenceLookupService } from "./reference-lookup.service";

@Module({
  imports: [PrismaModule],
  controllers: [ReferenceLookupController],
  providers: [ReferenceLookupService]
})
export class ReferenceLookupModule {}
