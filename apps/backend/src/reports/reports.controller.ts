import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { AppRole } from '../common/roles';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('weekly')
  latest(@Query('propertyId') propertyId: string) {
    return this.reportsService.latest(propertyId);
  }

  @Post('weekly')
  @Roles(AppRole.ORG_ADMIN, AppRole.MARKETING)
  create(@Query('propertyId') propertyId: string, @Body() body: any) {
    return this.reportsService.create(propertyId, body);
  }
}
