import { Controller, Get, Param } from '@nestjs/common';
import { PropertiesService } from './properties.service';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  list() {
    return this.propertiesService.list();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.propertiesService.detail(id);
  }
}
