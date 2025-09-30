import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  readonly etlQueue: Queue;
  readonly alertsQueue: Queue;

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    const connection = new IORedis(redisUrl);
    this.etlQueue = new Queue('etl', { connection });
    this.alertsQueue = new Queue('alerts', { connection });
  }

  async enqueueEtl(job: string, payload: Record<string, unknown>) {
    if (this.config.get('MOCK_MODE') === 'true') {
      this.logger.debug(`Mock enqueue ETL job ${job}`);
      return { id: 'mock', status: 'skipped' };
    }
    return this.etlQueue.add(job, payload, { removeOnComplete: true, removeOnFail: true });
  }

  async enqueueAlert(job: string, payload: Record<string, unknown>) {
    if (this.config.get('MOCK_MODE') === 'true') {
      this.logger.debug(`Mock enqueue Alert job ${job}`);
      return { id: 'mock', status: 'skipped' };
    }
    return this.alertsQueue.add(job, payload, { removeOnComplete: true, removeOnFail: true });
  }
}
