import { Module } from '@nestjs/common';
import { MockIntegrationsService } from './mock-integrations.service';

@Module({
  providers: [MockIntegrationsService],
  exports: [MockIntegrationsService],
})
export class ProvidersModule {}
