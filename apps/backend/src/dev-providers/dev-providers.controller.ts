import { BadRequestException, Body, Controller, Get, Param, Post, Query } from "@nestjs/common";

import { DevProvidersService } from "./dev-providers.service";

interface SaveScriptDto {
  code: string;
  readme?: string;
  createdBy?: string;
}

interface PublishDto {
  publishedBy?: string;
}

interface RunDto {
  createdBy?: string;
}

@Controller("admin/dev/providers")
export class DevProvidersController {
  constructor(private readonly devProvidersService: DevProvidersService) {}

  @Get(":sourceId/script")
  getScript(@Param("sourceId") sourceId: string) {
    return this.devProvidersService.getScriptBySource(sourceId);
  }

  @Post(":sourceId/script")
  saveScript(@Param("sourceId") sourceId: string, @Body() body: SaveScriptDto) {
    if (!body?.code) {
      throw new BadRequestException("Code is required");
    }
    return this.devProvidersService.saveDraft(sourceId, body.code, body.readme, body.createdBy);
  }

  @Post(":sourceId/publish")
  publish(@Param("sourceId") sourceId: string, @Body() body: PublishDto) {
    return this.devProvidersService.publish(sourceId, body?.publishedBy);
  }

  @Post(":sourceId/validate")
  validate(@Param("sourceId") sourceId: string) {
    return this.devProvidersService.runValidate(sourceId);
  }

  @Post(":sourceId/run")
  run(@Param("sourceId") sourceId: string, @Body() body: RunDto) {
    return this.devProvidersService.run(sourceId, body?.createdBy);
  }

  @Get(":sourceId/logs")
  listLogs(
    @Param("sourceId") sourceId: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    const normalizedLimit = parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined;
    return this.devProvidersService.listLogs(sourceId, normalizedLimit, cursor);
  }
}
