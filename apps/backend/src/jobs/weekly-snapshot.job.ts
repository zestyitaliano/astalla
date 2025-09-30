import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../modules/app.module';
import { ReportsService } from '../modules/reports/reports.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const reportsService = app.get(ReportsService);
  const snapshot = reportsService.create('prop-1');
  // eslint-disable-next-line no-console
  console.log('Weekly snapshot generated', snapshot);
  await app.close();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Weekly snapshot job failed', err);
  process.exit(1);
});
