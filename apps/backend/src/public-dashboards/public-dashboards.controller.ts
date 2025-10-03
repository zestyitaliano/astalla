import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";

import { CreatePublicDashboardDto } from "./dto/create-public-dashboard.dto";
import { UpdatePublicDashboardDto } from "./dto/update-public-dashboard.dto";
import { PublicDashboardsService } from "./public-dashboards.service";

@Controller("admin/public-dashboards")
export class PublicDashboardsController {
  constructor(private readonly publicDashboardsService: PublicDashboardsService) {}

  @Get()
  list() {
    return this.publicDashboardsService.list();
  }

  @Post()
  create(@Body() payload: CreatePublicDashboardDto) {
    return this.publicDashboardsService.create(payload);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() payload: UpdatePublicDashboardDto) {
    return this.publicDashboardsService.update(id, payload);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.publicDashboardsService.remove(id);
  }
}
