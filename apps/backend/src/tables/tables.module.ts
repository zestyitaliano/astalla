import { Module } from "@nestjs/common";

import { TableOperationsController } from "./table-operations.controller";
import { TableOperationsService } from "./table-operations.service";
import { TablesController } from "./tables.controller";
import { TablesService } from "./tables.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [TablesService, TableOperationsService],
  controllers: [TablesController, TableOperationsController],
  exports: [TablesService]
})
export class TablesModule {}
