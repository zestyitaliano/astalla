import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrgsModule } from './orgs/orgs.module';
import { PropertiesModule } from './properties/properties.module';
import { SourcesModule } from './sources/sources.module';
import { MetricsModule } from './metrics/metrics.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ReportsModule } from './reports/reports.module';
import { WordPressModule } from './wordpress/wordpress.module';
import { AlertsModule } from './alerts/alerts.module';
import { LeasingModule } from './leasing/leasing.module';
import { ProvidersModule } from './providers/providers.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthModule } from './health/health.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    PrismaModule,
    AuthModule,
    OrgsModule,
    PropertiesModule,
    SourcesModule,
    MetricsModule,
    ReviewsModule,
    ReportsModule,
    WordPressModule,
    AlertsModule,
    LeasingModule,
    ProvidersModule,
    JobsModule,
    HealthModule,
  ],
})
export class AppModule {
  static prismaServiceToken = PrismaService;
}
