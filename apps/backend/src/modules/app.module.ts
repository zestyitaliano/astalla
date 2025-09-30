import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { OrgsModule } from './orgs/orgs.module';
import { MetricsModule } from './metrics/metrics.module';
import { PropertiesModule } from './properties/properties.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ReportsModule } from './reports/reports.module';
import { HealthModule } from './health/health.module';
import { AdminModule } from './admin/admin.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    AuthModule,
    OrgsModule,
    MetricsModule,
    PropertiesModule,
    ReviewsModule,
    ReportsModule,
    HealthModule,
    AdminModule
  ]
})
export class AppModule {}
