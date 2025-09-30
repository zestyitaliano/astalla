import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('properties')
@UseGuards(JwtAuthGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  list(@Query('orgId') orgId?: string) {
    return this.propertiesService.list(orgId);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.propertiesService.get(id);
  }
}
