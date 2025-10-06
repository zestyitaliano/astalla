import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AlertsModule } from "./alerts/alerts.module";
import { AuthModule } from "./auth/auth.module";
import { DevProvidersModule } from "./dev-providers/dev-providers.module";
import { JobsModule } from "./jobs/jobs.module";
import { MetricsModule } from "./metrics/metrics.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PropertiesModule } from "./properties/properties.module";
import { ProvidersModule } from "./providers/providers.module";
import { PublicModule } from "./public/public.module";
import { PublicDashboardsModule } from "./public-dashboards/public-dashboards.module";
import { ReportsModule } from "./reports/reports.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { SourcesModule } from "./sources/sources.module";
import { TablesModule } from "./tables/tables.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        () => ({
          app: {
            port: Number(process.env.PORT || 3001)
          },
          mockMode: process.env.MOCK_MODE === "true",
          frontend: {
            origin: process.env.FRONTEND_ORIGIN
          },
          auth: {
            jwtSecret: process.env.JWT_SECRET || "dev-secret"
          },
          database: {
            url: process.env.DATABASE_URL
          },
          redis: {
            url: process.env.REDIS_URL
          }
        })
      ]
    }),
    PrismaModule,
    ProvidersModule,
    PropertiesModule,
    AuthModule,
    MetricsModule,
    ReviewsModule,
    PublicModule,
    PublicDashboardsModule,
    ReportsModule,
    AlertsModule,
    JobsModule,
    DevProvidersModule,
    SourcesModule,
    TablesModule
  ]
})
export class AppModule {}
