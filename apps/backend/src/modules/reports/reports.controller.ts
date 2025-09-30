import { Controller, Get, Post, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('weekly')
  latest(@Query('propertyId') propertyId: string) {
    return this.reportsService.latest(propertyId ?? 'prop-1');
  }

  @Post('weekly')
  create(@Query('propertyId') propertyId: string) {
    return this.reportsService.create(propertyId ?? 'prop-1');
  }
}
