import { BadRequestException, Body, Controller, Get, Param, Post } from "@nestjs/common";

import { TableOperationsService } from "./table-operations.service";

interface CreateTableBody {
  name?: string;
  description?: string;
}

@Controller()
export class TableOperationsController {
  constructor(private readonly tableOperations: TableOperationsService) {}

  @Post("tables")
  async createTable(@Body() body: CreateTableBody) {
    const rawName = typeof body.name === "string" ? body.name.trim() : "";

    if (!rawName) {
      throw new BadRequestException("name is required");
    }

    const description = typeof body.description === "string" ? body.description : undefined;
    return this.tableOperations.createTable(rawName, description);
  }

  @Get("ops/:id")
  getOperation(@Param("id") id: string) {
    return this.tableOperations.getOperation(id);
  }
}
