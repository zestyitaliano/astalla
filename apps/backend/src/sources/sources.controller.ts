import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from "@nestjs/common";

import { CreateSourceDto, UpdateSourceDto } from "./sources.dto";
import { SourcesService } from "./sources.service";

@Controller("admin/sources")
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  list(@Headers("x-mock-mode") mockHeader?: string) {
    return this.sourcesService.list(this.shouldUseMock(mockHeader));
  }

  @Post()
  create(@Body() dto: CreateSourceDto) {
    return this.sourcesService.create({
      ...dto,
      credential: dto.credential
    });
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateSourceDto) {
    return this.sourcesService.update(id, {
      ...dto,
      credential: dto.credential
    });
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.sourcesService.remove(id);
  }

  @Post(":id/run")
  run(@Param("id") id: string) {
    return this.sourcesService.run(id);
  }

  private shouldUseMock(header?: string) {
    return header?.toLowerCase() === "true";
  }
}
