import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { TablesService } from "./tables.service";

@Controller("forms")
export class TableFormsController {
  constructor(private readonly tablesService: TablesService) {}

  @Get(":id")
  getForm(@Param("id") id: string) {
    return this.tablesService.getForm(id);
  }

  @Post(":id/submit")
  submitForm(
    @Param("id") id: string,
    @Body()
    body: {
      values: Record<string, unknown>;
      actorId?: string | null;
    }
  ) {
    return this.tablesService.submitForm(id, {
      values: body.values,
      actorId: body.actorId
    });
  }
}
