import { Controller, Get, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('tiles')
  tiles(@Query('propertyId') propertyId: string) {
    return this.metricsService.tiles(propertyId ?? 'prop-1');
  }

  @Get('occupancy')
  occupancy(@Query('propertyId') propertyId: string) {
    return this.metricsService.occupancy(propertyId ?? 'prop-1');
  }

  @Get('pipeline')
  pipeline(@Query('propertyId') propertyId: string) {
    return this.metricsService.pipeline(propertyId ?? 'prop-1');
  }

  @Get('cost')
  cost(@Query('propertyId') propertyId: string) {
    return this.metricsService.cost(propertyId ?? 'prop-1');
  }
}
