import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SourcesService } from './sources.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { AppRole } from '../common/roles';

@Controller('admin/sources')
@UseGuards(JwtAuthGuard)
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  @Roles(AppRole.ORG_ADMIN, AppRole.MARKETING)
  list(@Query('propertyId') propertyId?: string) {
    return this.sourcesService.list(propertyId);
  }
}
