import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('occupancy')
  occupancy(@Query('propertyId') propertyId: string, @Query('window') window = '30') {
    return this.metricsService.occupancy(propertyId, Number(window));
  }

  @Get('pipeline')
  pipeline(@Query('propertyId') propertyId: string) {
    return this.metricsService.pipeline(propertyId);
  }

  @Get('cost')
  cost(@Query('propertyId') propertyId: string) {
    return this.metricsService.cost(propertyId);
  }
}
