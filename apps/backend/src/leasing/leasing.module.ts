import { Module } from '@nestjs/common';
import { LeasingService } from './leasing.service';

@Module({
  providers: [LeasingService],
  exports: [LeasingService],
})
export class LeasingModule {}
