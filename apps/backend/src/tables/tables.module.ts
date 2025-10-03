import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";

import { TableCollaborationGateway } from "./table-collaboration.gateway";
import { TableCollaborationService } from "./table-collaboration.service";
import { TableFormsController } from "./table-forms.controller";
import { TablesController } from "./tables.controller";
import { TablesService } from "./tables.service";

@Module({
  imports: [PrismaModule],
  controllers: [TablesController, TableFormsController],
  providers: [TablesService, TableCollaborationService, TableCollaborationGateway],
  exports: [TablesService]
})
export class TablesModule {}
