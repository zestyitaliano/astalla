import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { LeasingModule } from '../leasing/leasing.module';

@Module({
  imports: [LeasingModule],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
