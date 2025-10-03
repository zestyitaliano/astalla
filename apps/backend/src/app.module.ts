import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AlertsModule } from "./alerts/alerts.module";
import { AuthModule } from "./auth/auth.module";
import { JobsModule } from "./jobs/jobs.module";
import { MetricsModule } from "./metrics/metrics.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PropertiesModule } from "./properties/properties.module";
import { ProvidersModule } from "./providers/providers.module";
import { ReportsModule } from "./reports/reports.module";
import { ReviewsModule } from "./reviews/reviews.module";

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
    ReportsModule,
    AlertsModule,
    JobsModule
  ]
})
export class AppModule {}
